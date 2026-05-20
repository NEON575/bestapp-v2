import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, StockMovementType, StockReservationStatus } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { PaginationQueryDto } from '../../common/query/pagination.dto';
import { buildPaginatedResponse, normalizePagination } from '../../common/query/pagination';
import { calculateInventorySummary } from '../../common/business/inventory-summary';
import {
  CreateMaterialDto,
  CreateStockMovementDto,
  MaterialQueryDto,
  ReserveStockDto,
  UpdateMaterialDto,
  WriteOffStockDto
} from './dto/inventory.dto';
import {
  NotEnoughStockException,
  ReservationAlreadyConsumedException
} from '../../common/business/exceptions';
import { getMovementBalanceDelta } from '../../common/business/inventory-balance';

function toNumber(value: Prisma.Decimal | number | string | null | undefined) {
  if (value == null) return 0;
  return typeof value === 'number' ? value : Number(value.toString());
}

function roundQty(value: number) {
  return Math.round(value * 10000) / 10000;
}

function resolveMaterialUnitCost(input: {
  unitCost?: number | null;
  costPrice?: number | null;
  packPrice?: number | null;
  quantityInPack?: number | null;
}) {
  if (input.unitCost != null && Number.isFinite(input.unitCost)) {
    return input.unitCost;
  }

  if (
    input.packPrice != null &&
    Number.isFinite(input.packPrice) &&
    input.quantityInPack != null &&
    Number.isFinite(input.quantityInPack) &&
    input.quantityInPack > 0
  ) {
    return roundQty(input.packPrice / input.quantityInPack);
  }

  if (input.costPrice != null && Number.isFinite(input.costPrice)) {
    return input.costPrice;
  }

  return 0;
}

@Injectable()
export class InventoryService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuditService) private readonly auditService: AuditService
  ) {}

  private db(tx?: Prisma.TransactionClient) {
    return tx ?? this.prisma;
  }

  private async ensureMaterial(id: string, tx?: Prisma.TransactionClient) {
    const material = await this.db(tx).material.findFirst({
      where: { id, deletedAt: null }
    });

    if (!material) {
      throw new NotFoundException('Material not found');
    }

    return material;
  }

  private async ensureWarehouse(id: string, tx?: Prisma.TransactionClient) {
    const warehouse = await this.db(tx).warehouse.findFirst({
      where: { id, deletedAt: null }
    });

    if (!warehouse) {
      throw new NotFoundException('Warehouse not found');
    }

    return warehouse;
  }

  private async syncStockLevel(materialId: string, warehouseId: string, tx?: Prisma.TransactionClient) {
    const db = this.db(tx);
    const movementTotals = await db.stockMovement.aggregate({
      where: { materialId, warehouseId },
      _sum: {
        balanceDelta: true
      }
    });

    const reservationTotals = await db.stockReservation.aggregate({
      where: {
        materialId,
        warehouseId,
        status: { in: [StockReservationStatus.open, StockReservationStatus.reserved] }
      },
      _sum: {
        quantity: true
      }
    });

    const onHand = roundQty(toNumber(movementTotals._sum.balanceDelta));
    const reserved = roundQty(toNumber(reservationTotals._sum.quantity));
    const available = roundQty(onHand - reserved);

    await db.stockLevel.upsert({
      where: {
        materialId_warehouseId: {
          materialId,
          warehouseId
        }
      },
      update: {
        onHand,
        reserved,
        available
      },
      create: {
        materialId,
        warehouseId,
        onHand,
        reserved,
        available
      }
    });
  }

  private async getStockLevel(materialId: string, warehouseId: string, tx?: Prisma.TransactionClient) {
    const level = await this.db(tx).stockLevel.findUnique({
      where: {
        materialId_warehouseId: {
          materialId,
          warehouseId
        }
      }
    });

    return {
      onHand: roundQty(toNumber(level?.onHand)),
      reserved: roundQty(toNumber(level?.reserved)),
      available: roundQty(toNumber(level?.available))
    };
  }

  private async releaseReservationInTx(tx: Prisma.TransactionClient, reservationId: string) {
    const reservation = await tx.stockReservation.findFirst({
      where: { id: reservationId, deletedAt: null }
    });

    if (!reservation) {
      throw new NotFoundException('Reservation not found');
    }

    if (reservation.status === StockReservationStatus.consumed) {
      throw new ReservationAlreadyConsumedException();
    }

    if (reservation.status === StockReservationStatus.released) {
      return reservation;
    }

    const updated = await tx.stockReservation.update({
      where: { id: reservationId },
      data: {
        status: StockReservationStatus.released,
        releasedAt: new Date()
      }
    });

    await this.syncStockLevel(reservation.materialId, reservation.warehouseId, tx);

    await this.auditService.logTx(tx, {
      action: 'stock.reservation_released',
      entityType: 'stockReservation',
      entityId: reservation.id,
      beforeData: reservation,
      afterData: updated
    });

    return updated;
  }

  private async consumeReservationInTx(tx: Prisma.TransactionClient, reservationId: string) {
    const reservation = await tx.stockReservation.findFirst({
      where: { id: reservationId, deletedAt: null }
    });

    if (!reservation) {
      throw new NotFoundException('Reservation not found');
    }

    if (reservation.status === StockReservationStatus.consumed) {
      throw new ReservationAlreadyConsumedException();
    }

    if (reservation.status === StockReservationStatus.released || reservation.status === StockReservationStatus.cancelled) {
      throw new NotEnoughStockException('Reservation is not active');
    }

    const material = await this.ensureMaterial(reservation.materialId, tx);
    const warehouse = await this.ensureWarehouse(reservation.warehouseId, tx);

    await tx.stockMovement.create({
      data: {
        materialId: reservation.materialId,
        warehouseId: reservation.warehouseId,
        orderId: reservation.orderId,
        orderItemId: reservation.orderItemId,
        type: StockMovementType.write_off,
        quantity: reservation.quantity,
        balanceDelta: -Math.abs(toNumber(reservation.quantity)),
        unitCost: toNumber(material.costPrice),
        totalCost: roundQty(toNumber(material.costPrice) * toNumber(reservation.quantity)),
        reference: `reservation:${reservation.id}`,
        note: reservation.note ?? 'Reservation consumed'
      }
    });

    const updated = await tx.stockReservation.update({
      where: { id: reservationId },
      data: {
        status: StockReservationStatus.consumed,
        consumedAt: new Date()
      }
    });

    await this.syncStockLevel(material.id, warehouse.id, tx);

    await this.auditService.logTx(tx, {
      action: 'stock.reservation_consumed',
      entityType: 'stockReservation',
      entityId: reservation.id,
      beforeData: reservation,
      afterData: updated
    });

    return updated;
  }

  findAllMaterials() {
    return this.findMaterials({ page: 1, limit: 20 });
  }

  private mapMaterial(material: {
    id: string;
    name: string;
    sku: string | null;
    unit: string;
    gram?: Prisma.Decimal | null;
    size?: string | null;
    packPrice?: Prisma.Decimal | null;
    quantityInPack?: number | null;
    unitCost?: Prisma.Decimal | null;
    vatIncluded?: boolean | null;
    minStockLevel: Prisma.Decimal | number | string;
    costPrice?: Prisma.Decimal | number | string | null;
    notes?: string | null;
    category?: { id: string; code: string; name: string; description: string | null } | null;
    supplier?: { id: string; code: string | null; name: string; phone: string | null; email: string | null; address: string | null; notes: string | null; isActive: boolean } | null;
    stockLevels?: Array<{ onHand: Prisma.Decimal | number | string; reserved: Prisma.Decimal | number | string; available: Prisma.Decimal | number | string }>;
  }) {
    const stockLevels = material.stockLevels ?? [];
    const onHand = roundQty(stockLevels.reduce((sum, level) => sum + toNumber(level.onHand), 0));
    const reserved = roundQty(stockLevels.reduce((sum, level) => sum + toNumber(level.reserved), 0));
    const available = roundQty(stockLevels.reduce((sum, level) => sum + toNumber(level.available), 0));
    const unitCost = toNumber(material.unitCost ?? material.costPrice);

    return {
      id: material.id,
      name: material.name,
      sku: material.sku,
      unit: material.unit,
      gram: material.gram != null ? toNumber(material.gram) : null,
      size: material.size ?? null,
      packPrice: toNumber(material.packPrice),
      quantityInPack: material.quantityInPack ?? 1,
      unitCost,
      vatIncluded: Boolean(material.vatIncluded),
      minStockLevel: toNumber(material.minStockLevel),
      onHand,
      reserved,
      available,
      costPrice: toNumber(material.costPrice ?? material.unitCost),
      notes: material.notes ?? null,
      category: material.category ?? null,
      supplier: material.supplier ?? null
    };
  }

  async findMaterials(query: MaterialQueryDto) {
    const { page, limit, skip, take } = normalizePagination(query);
    const where: Prisma.MaterialWhereInput = {
      deletedAt: null,
      ...(query.categoryId ? { categoryId: query.categoryId } : {}),
      ...(query.supplierId ? { supplierId: query.supplierId } : {}),
      ...(query.gram ? { gram: query.gram } : {}),
      ...(query.size ? { size: { contains: query.size, mode: 'insensitive' } } : {}),
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: 'insensitive' } },
              { sku: { contains: query.search, mode: 'insensitive' } },
              { unit: { contains: query.search, mode: 'insensitive' } },
              { category: { name: { contains: query.search, mode: 'insensitive' } } },
              { supplier: { name: { contains: query.search, mode: 'insensitive' } } },
              { size: { contains: query.search, mode: 'insensitive' } }
            ]
          }
        : {})
    };

    const orderByField = query.sortBy ?? 'createdAt';
    const orderBy = { [orderByField]: query.sortOrder ?? 'desc' } as Prisma.MaterialOrderByWithRelationInput;

    const materials = await this.prisma.material.findMany({
      where,
      orderBy,
      include: {
        category: true,
        supplier: true,
        stockLevels: {
          include: {
            warehouse: true
          }
        }
      }
    });

    const normalized = materials.map((material) => this.mapMaterial(material));
    const filtered = query.lowStockOnly
      ? normalized.filter((material) => material.available <= material.minStockLevel)
      : normalized;
    const paged = filtered.slice(skip, skip + take);

    return buildPaginatedResponse(paged, filtered.length, page, limit);
  }

  async findOneMaterial(id: string) {
    const material = await this.prisma.material.findFirst({
      where: { id, deletedAt: null },
      include: {
        category: true,
        supplier: true,
        stockLevels: {
          include: {
            warehouse: true
          }
        }
      }
    });

    if (!material) {
      return null;
    }

    return this.mapMaterial(material);
  }

  async createMaterial(dto: CreateMaterialDto) {
    const quantityInPack = dto.quantityInPack ? Math.max(1, Math.round(dto.quantityInPack)) : 1;
    const unitCost = resolveMaterialUnitCost({
      unitCost: dto.unitCost,
      costPrice: dto.costPrice,
      packPrice: dto.packPrice,
      quantityInPack
    });

    return this.prisma.material.create({
      data: {
        categoryId: dto.categoryId,
        supplierId: dto.supplierId,
        name: dto.name,
        sku: dto.sku,
        unit: dto.unit,
        gram: dto.gram,
        size: dto.size,
        packPrice: dto.packPrice ?? 0,
        quantityInPack,
        unitCost,
        vatIncluded: dto.vatIncluded ?? false,
        minStockLevel: dto.minStockLevel ?? 0,
        stockQuantity: dto.stockQuantity ?? 0,
        reservedQuantity: dto.reservedQuantity ?? 0,
        costPrice: dto.costPrice ?? unitCost,
        notes: dto.notes
      }
    });
  }

  async updateMaterial(id: string, dto: UpdateMaterialDto) {
    const existing = await this.ensureMaterial(id);
    const quantityInPack = dto.quantityInPack ? Math.max(1, Math.round(dto.quantityInPack)) : 1;
    const nextQuantityInPack = dto.quantityInPack != null ? quantityInPack : (existing as any).quantityInPack ?? 1;
    const nextPackPrice = dto.packPrice ?? toNumber((existing as any).packPrice);
    const unitCost = resolveMaterialUnitCost({
      unitCost: dto.unitCost,
      costPrice: dto.costPrice ?? toNumber((existing as any).costPrice),
      packPrice: nextPackPrice,
      quantityInPack: nextQuantityInPack
    });

    return this.prisma.material.update({
      where: { id },
      data: {
        categoryId: dto.categoryId,
        supplierId: dto.supplierId,
        name: dto.name,
        sku: dto.sku,
        unit: dto.unit,
        gram: dto.gram,
        size: dto.size,
        packPrice: dto.packPrice,
        quantityInPack: dto.quantityInPack != null ? quantityInPack : undefined,
        unitCost,
        vatIncluded: dto.vatIncluded,
        minStockLevel: dto.minStockLevel,
        stockQuantity: dto.stockQuantity,
        reservedQuantity: dto.reservedQuantity,
        costPrice: dto.costPrice ?? unitCost,
        notes: dto.notes
      }
    });
  }

  removeMaterial(id: string) {
    return this.prisma.material.update({
      where: { id },
      data: { deletedAt: new Date() }
    });
  }

  async findMovements(query: PaginationQueryDto) {
    const { page, limit, skip, take } = normalizePagination(query);
    const where: Prisma.StockMovementWhereInput = {
      ...(query.search
        ? {
            OR: [
              { reference: { contains: query.search, mode: 'insensitive' } },
              { note: { contains: query.search, mode: 'insensitive' } },
              { material: { name: { contains: query.search, mode: 'insensitive' } } },
              { material: { sku: { contains: query.search, mode: 'insensitive' } } }
            ]
          }
        : {}),
      ...(query.dateFrom || query.dateTo
        ? {
            createdAt: {
              gte: query.dateFrom ? new Date(query.dateFrom) : undefined,
              lte: query.dateTo ? new Date(query.dateTo) : undefined
            }
          }
        : {})
    };

    const orderByField = query.sortBy ?? 'createdAt';
    const orderBy = { [orderByField]: query.sortOrder ?? 'desc' } as Prisma.StockMovementOrderByWithRelationInput;

    const [total, data] = await this.prisma.$transaction([
      this.prisma.stockMovement.count({ where }),
      this.prisma.stockMovement.findMany({
        where,
        skip,
        take,
        orderBy,
        include: {
          material: true,
          warehouse: true,
          order: true,
          orderItem: true,
          productionJob: true
        }
      })
    ]);

    return buildPaginatedResponse(data, total, page, limit);
  }

  async createMovement(dto: CreateStockMovementDto) {
    return this.prisma.$transaction(
      async (tx) => {
        const material = await this.ensureMaterial(dto.materialId, tx);
        if (dto.warehouseId) {
          await this.ensureWarehouse(dto.warehouseId, tx);
        }

        const totalCost = dto.totalCost ?? roundQty((dto.unitCost ?? 0) * dto.quantity);
        const balanceDelta = getMovementBalanceDelta(dto.type as StockMovementType, dto.quantity);

        const movement = await tx.stockMovement.create({
          data: {
            materialId: dto.materialId,
            warehouseId: dto.warehouseId,
            orderId: dto.orderId,
            orderItemId: dto.orderItemId,
            productionJobId: dto.productionJobId,
            type: dto.type as StockMovementType,
            quantity: dto.quantity,
            balanceDelta,
            unitCost: dto.unitCost ?? 0,
            totalCost,
            reference: dto.reference,
            note: dto.note
          }
        });

        if (dto.warehouseId) {
          await this.syncStockLevel(dto.materialId, dto.warehouseId, tx);
        }

        await this.auditService.logTx(tx, {
          action: 'stock.movement_created',
          entityType: 'stockMovement',
          entityId: movement.id,
          afterData: movement,
          metadata: {
            materialId: material.id,
            warehouseId: dto.warehouseId ?? null
          }
        });

        return movement;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    );
  }

  async reserve(dto: ReserveStockDto) {
    return this.prisma.$transaction(
      async (tx) => {
        const material = await this.ensureMaterial(dto.materialId, tx);
        const warehouse = await this.ensureWarehouse(dto.warehouseId, tx);
        const stock = await this.getStockLevel(material.id, warehouse.id, tx);

        if (stock.available < dto.quantity) {
          throw new NotEnoughStockException();
        }

        const reservation = await tx.stockReservation.create({
          data: {
            orderId: dto.orderId,
            orderItemId: dto.orderItemId,
            materialId: dto.materialId,
            warehouseId: dto.warehouseId,
            quantity: dto.quantity,
            status: StockReservationStatus.reserved,
            reservedAt: new Date(),
            note: dto.note
          }
        });

        await tx.stockMovement.create({
          data: {
            materialId: dto.materialId,
            warehouseId: dto.warehouseId,
            orderId: dto.orderId,
            orderItemId: dto.orderItemId,
            type: StockMovementType.reserve,
            quantity: dto.quantity,
            balanceDelta: 0,
            unitCost: toNumber(material.costPrice),
            totalCost: roundQty(toNumber(material.costPrice) * dto.quantity),
            reference: `reserve:${reservation.id}`,
            note: dto.note
          }
        });

        await this.syncStockLevel(material.id, warehouse.id, tx);

        await this.auditService.logTx(tx, {
          action: 'stock.reserved',
          entityType: 'stockReservation',
          entityId: reservation.id,
          afterData: reservation,
          metadata: {
            availableBefore: stock.available,
            reservedQty: dto.quantity
          }
        });

        return reservation;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    );
  }

  async releaseReservation(reservationId: string) {
    return this.prisma.$transaction(
      (tx) => this.releaseReservationInTx(tx, reservationId),
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    );
  }

  async consumeReservation(reservationId: string) {
    return this.prisma.$transaction(
      (tx) => this.consumeReservationInTx(tx, reservationId),
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    );
  }

  async writeOff(dto: WriteOffStockDto) {
    return this.prisma.$transaction(
      async (tx) => {
        if (dto.reservationId) {
          return this.consumeReservationInTx(tx, dto.reservationId);
        }

        const material = await this.ensureMaterial(dto.materialId, tx);
        const warehouseId = dto.warehouseId;
        if (warehouseId) {
          await this.ensureWarehouse(warehouseId, tx);
          const stock = await this.getStockLevel(material.id, warehouseId, tx);
          if (stock.onHand < dto.quantity) {
            throw new NotEnoughStockException();
          }
        }

        const movement = await tx.stockMovement.create({
          data: {
            materialId: dto.materialId,
            warehouseId,
            orderId: dto.orderId,
            productionJobId: dto.productionJobId,
            type: StockMovementType.write_off,
            quantity: dto.quantity,
            balanceDelta: -Math.abs(dto.quantity),
            unitCost: toNumber(material.costPrice),
            totalCost: roundQty(toNumber(material.costPrice) * dto.quantity),
            note: dto.note
          }
        });

        if (warehouseId) {
          await this.syncStockLevel(material.id, warehouseId, tx);
        }

        await this.auditService.logTx(tx, {
          action: 'stock.written_off',
          entityType: 'stockMovement',
          entityId: movement.id,
          afterData: movement
        });

        return movement;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    );
  }

  findWarehouses() {
    return this.prisma.warehouse.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'desc' }
    });
  }

  createWarehouse(data: { code: string; name: string; description?: string }) {
    return this.prisma.warehouse.create({
      data
    });
  }

  createCategory(data: { code: string; name: string; description?: string }) {
    return this.prisma.materialCategory.create({
      data
    });
  }

  listCategories() {
    return this.prisma.materialCategory.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'desc' }
    });
  }

  async summary() {
    const materials = await this.prisma.material.findMany({
      where: { deletedAt: null },
      include: {
        stockLevels: true
      }
    });

    const recentMovements = await this.prisma.stockMovement.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: {
        material: true,
        warehouse: true
      }
    });

    const normalizedMaterials = materials.map((material) => {
      const stockLevels = material.stockLevels ?? [];
      const onHand = stockLevels.reduce((sum, level) => sum + toNumber(level.onHand), 0);
      const reserved = stockLevels.reduce((sum, level) => sum + toNumber(level.reserved), 0);
      const available = stockLevels.reduce((sum, level) => sum + toNumber(level.available), 0);
      const unitCost = toNumber((material as any).unitCost ?? material.costPrice);

      return {
        id: material.id,
        name: material.name,
        sku: material.sku,
        unit: material.unit,
        gram: (material as any).gram != null ? toNumber((material as any).gram) : null,
        size: (material as any).size ?? null,
        packPrice: toNumber((material as any).packPrice),
        quantityInPack: (material as any).quantityInPack ?? 1,
        unitCost,
        vatIncluded: Boolean((material as any).vatIncluded),
        minStockLevel: toNumber(material.minStockLevel),
        onHand,
        reserved,
        available,
        costPrice: unitCost,
        notes: (material as any).notes ?? null
      };
    });

    const materialsBelowMinimum = normalizedMaterials.filter((material) => material.available <= material.minStockLevel);
    const totalStockValue = roundQty(
      normalizedMaterials.reduce((sum, material) => sum + material.onHand * material.costPrice, 0)
    );
    const reservedValue = roundQty(
      normalizedMaterials.reduce((sum, material) => sum + material.reserved * material.costPrice, 0)
    );

    return calculateInventorySummary({
      totalMaterials: normalizedMaterials.length,
      lowStockCount: materialsBelowMinimum.length,
      totalStockValue,
      reservedValue,
      materialsBelowMinimum,
      recentMovements
    });
  }
}
