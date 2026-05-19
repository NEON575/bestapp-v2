import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, StockMovementType, StockReservationStatus } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { PaginationQueryDto } from '../../common/query/pagination.dto';
import { buildPaginatedResponse, normalizePagination } from '../../common/query/pagination';
import { calculateInventorySummary } from '../../common/business/inventory-summary';
import {
  CreateMaterialDto,
  CreateStockMovementDto,
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

@Injectable()
export class InventoryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService
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

  async findMaterials(query: PaginationQueryDto) {
    const { page, limit, skip, take } = normalizePagination(query);
    const where: Prisma.MaterialWhereInput = {
      deletedAt: null,
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: 'insensitive' } },
              { sku: { contains: query.search, mode: 'insensitive' } },
              { unit: { contains: query.search, mode: 'insensitive' } },
              { category: { name: { contains: query.search, mode: 'insensitive' } } }
            ]
          }
        : {})
    };

    const orderByField = query.sortBy ?? 'createdAt';
    const orderBy = { [orderByField]: query.sortOrder ?? 'desc' } as Prisma.MaterialOrderByWithRelationInput;

    const [total, data] = await this.prisma.$transaction([
      this.prisma.material.count({ where }),
      this.prisma.material.findMany({
        where,
        skip,
        take,
        orderBy,
        include: {
          category: true,
          stockLevels: {
            include: {
              warehouse: true
            }
          }
        }
      })
    ]);

    return buildPaginatedResponse(data, total, page, limit);
  }

  findOneMaterial(id: string) {
    return this.prisma.material.findFirst({
      where: { id, deletedAt: null },
      include: {
        category: true,
        stockLevels: {
          include: {
            warehouse: true
          }
        }
      }
    });
  }

  async createMaterial(dto: CreateMaterialDto) {
    return this.prisma.material.create({
      data: {
        categoryId: dto.categoryId,
        name: dto.name,
        sku: dto.sku,
        unit: dto.unit,
        minStockLevel: dto.minStockLevel ?? 0,
        stockQuantity: dto.stockQuantity ?? 0,
        reservedQuantity: dto.reservedQuantity ?? 0,
        costPrice: dto.costPrice ?? 0
      }
    });
  }

  updateMaterial(id: string, dto: UpdateMaterialDto) {
    return this.prisma.material.update({
      where: { id },
      data: {
        categoryId: dto.categoryId,
        name: dto.name,
        sku: dto.sku,
        unit: dto.unit,
        minStockLevel: dto.minStockLevel,
        stockQuantity: dto.stockQuantity,
        reservedQuantity: dto.reservedQuantity,
        costPrice: dto.costPrice
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

      return {
        id: material.id,
        name: material.name,
        sku: material.sku,
        unit: material.unit,
        minStockLevel: toNumber(material.minStockLevel),
        onHand,
        reserved,
        available,
        costPrice: toNumber(material.costPrice)
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
