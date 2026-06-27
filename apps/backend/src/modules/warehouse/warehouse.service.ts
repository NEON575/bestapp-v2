import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, StockReservationStatus } from '@prisma/client';
import { buildPaginatedResponse, normalizePagination } from '../../common/query/pagination';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateWarehouseDto, WarehouseFilterQueryDto } from './dto/warehouse.dto';

function toNumber(value: Prisma.Decimal | number | string | null | undefined) {
  if (value == null) {
    return 0;
  }

  return Number(value.toString());
}

function roundQty(value: number) {
  return Math.round(value * 10000) / 10000;
}

function sanitizeText(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

@Injectable()
export class WarehouseService {
  constructor(private readonly prisma: PrismaService) {}

  private db(tx?: Prisma.TransactionClient) {
    return tx ?? this.prisma;
  }

  async ensureMainWarehouse(tx?: Prisma.TransactionClient) {
    return this.db(tx).warehouse.upsert({
      where: { code: 'MAIN' },
      update: {
        name: 'Əsas anbar',
        description: 'Default warehouse',
        isActive: true,
        deletedAt: null
      },
      create: {
        code: 'MAIN',
        name: 'Əsas anbar',
        description: 'Default warehouse',
        isActive: true
      }
    });
  }

  async findWarehouseOrMain(id?: string | null, tx?: Prisma.TransactionClient) {
    if (!id) {
      return this.ensureMainWarehouse(tx);
    }

    const warehouse = await this.db(tx).warehouse.findFirst({
      where: { id, deletedAt: null }
    });

    if (!warehouse) {
      throw new NotFoundException('Warehouse not found');
    }

    return warehouse;
  }

  async listWarehouses() {
    await this.ensureMainWarehouse();

    return this.prisma.warehouse.findMany({
      where: { deletedAt: null },
      orderBy: [{ code: 'asc' }, { createdAt: 'asc' }]
    });
  }

  async createWarehouse(dto: CreateWarehouseDto) {
    const code = dto.code.trim().toUpperCase();
    const name = dto.name.trim();

    if (!code) {
      throw new BadRequestException('Anbar kodu boş ola bilməz');
    }

    if (!name) {
      throw new BadRequestException('Anbar adı boş ola bilməz');
    }

    return this.prisma.warehouse.upsert({
      where: { code },
      update: {
        name,
        description: sanitizeText(dto.description),
        isActive: true,
        deletedAt: null
      },
      create: {
        code,
        name,
        description: sanitizeText(dto.description),
        isActive: true
      }
    });
  }

  async syncStockLevel(materialId: string, warehouseId: string, tx?: Prisma.TransactionClient) {
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

  async listLevels(query: WarehouseFilterQueryDto) {
    const { page, limit, skip, take } = normalizePagination(query);
    const search = query.search?.trim();

    const where: Prisma.StockLevelWhereInput = {
      ...(query.warehouseId ? { warehouseId: query.warehouseId } : {}),
      ...(search
        ? {
            OR: [
              { material: { materialNo: { contains: search, mode: 'insensitive' } } },
              { material: { name: { contains: search, mode: 'insensitive' } } },
              { warehouse: { code: { contains: search, mode: 'insensitive' } } },
              { warehouse: { name: { contains: search, mode: 'insensitive' } } }
            ]
          }
        : {})
    };

    const [total, levels] = await this.prisma.$transaction([
      this.prisma.stockLevel.count({ where }),
      this.prisma.stockLevel.findMany({
        where,
        include: {
          material: {
            include: {
              category: true
            }
          },
          warehouse: true
        },
        orderBy: [{ updatedAt: 'desc' }, { id: 'asc' }],
        skip,
        take
      })
    ]);

    return buildPaginatedResponse(
      levels.map((level) => ({
        id: level.id,
        materialId: level.materialId,
        warehouseId: level.warehouseId,
        onHand: toNumber(level.onHand),
        reserved: toNumber(level.reserved),
        available: toNumber(level.available),
        updatedAt: level.updatedAt.toISOString(),
        material: level.material
          ? {
              ...level.material,
              defaultUnitsPerPackage:
                level.material.defaultUnitsPerPackage == null ? null : toNumber(level.material.defaultUnitsPerPackage),
              packagesPerPallet: level.material.packagesPerPallet == null ? null : toNumber(level.material.packagesPerPallet),
              defaultUnitsPerPallet:
                level.material.defaultUnitsPerPallet == null ? null : toNumber(level.material.defaultUnitsPerPallet)
            }
          : null,
        warehouse: level.warehouse
          ? {
              id: level.warehouse.id,
              code: level.warehouse.code,
              name: level.warehouse.name,
              description: level.warehouse.description
            }
          : null
      })),
      total,
      page,
      limit
    );
  }

  async listMovements(query: WarehouseFilterQueryDto) {
    const { page, limit, skip, take } = normalizePagination(query);
    const search = query.search?.trim();

    const where: Prisma.StockMovementWhereInput = {
      ...(query.warehouseId ? { warehouseId: query.warehouseId } : {}),
      ...(search
        ? {
            OR: [
              { reference: { contains: search, mode: 'insensitive' } },
              { note: { contains: search, mode: 'insensitive' } },
              { material: { materialNo: { contains: search, mode: 'insensitive' } } },
              { material: { name: { contains: search, mode: 'insensitive' } } },
              { warehouse: { code: { contains: search, mode: 'insensitive' } } },
              { warehouse: { name: { contains: search, mode: 'insensitive' } } }
            ]
          }
        : {})
    };

    const [total, movements] = await this.prisma.$transaction([
      this.prisma.stockMovement.count({ where }),
      this.prisma.stockMovement.findMany({
        where,
        include: {
          material: {
            include: {
              category: true
            }
          },
          warehouse: true
        },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip,
        take
      })
    ]);

    return buildPaginatedResponse(
      movements.map((movement) => ({
        id: movement.id,
        materialId: movement.materialId,
        warehouseId: movement.warehouseId,
        type: movement.type,
        quantity: toNumber(movement.quantity),
        balanceDelta: toNumber(movement.balanceDelta),
        unitCost: toNumber(movement.unitCost),
        totalCost: toNumber(movement.totalCost),
        reference: movement.reference,
        note: movement.note,
        createdAt: movement.createdAt.toISOString(),
        material: movement.material
          ? {
              ...movement.material,
              defaultUnitsPerPackage:
                movement.material.defaultUnitsPerPackage == null ? null : toNumber(movement.material.defaultUnitsPerPackage),
              packagesPerPallet: movement.material.packagesPerPallet == null ? null : toNumber(movement.material.packagesPerPallet),
              defaultUnitsPerPallet:
                movement.material.defaultUnitsPerPallet == null ? null : toNumber(movement.material.defaultUnitsPerPallet)
            }
          : null,
        warehouse: movement.warehouse
          ? {
              id: movement.warehouse.id,
              code: movement.warehouse.code,
              name: movement.warehouse.name,
              description: movement.warehouse.description
            }
          : null
      })),
      total,
      page,
      limit
    );
  }
}
