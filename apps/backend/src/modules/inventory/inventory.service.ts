import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, StockMovementType } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import {
  CreateMaterialDto,
  CreateStockMovementDto,
  ReserveStockDto,
  UpdateMaterialDto,
  WriteOffStockDto
} from './dto/inventory.dto';

function toNumber(value: Prisma.Decimal | number | string | null | undefined) {
  if (value == null) return 0;
  return typeof value === 'number' ? value : Number(value.toString());
}

function roundQty(value: number) {
  return Math.round(value * 10000) / 10000;
}

@Injectable()
export class InventoryService {
  constructor(private readonly prisma: PrismaService) {}

  private async ensureMaterial(id: string) {
    const material = await this.prisma.material.findFirst({
      where: { id, deletedAt: null }
    });

    if (!material) {
      throw new NotFoundException('Material not found');
    }

    return material;
  }

  private async ensureWarehouse(id: string) {
    const warehouse = await this.prisma.warehouse.findFirst({
      where: { id, deletedAt: null }
    });

    if (!warehouse) {
      throw new NotFoundException('Warehouse not found');
    }

    return warehouse;
  }

  private async syncStockLevel(materialId: string, warehouseId: string) {
    const movementTotals = await this.prisma.stockMovement.aggregate({
      where: { materialId, warehouseId },
      _sum: {
        quantity: true
      }
    });

    const reservationTotals = await this.prisma.stockReservation.aggregate({
      where: { materialId, warehouseId, status: { in: ['open', 'reserved'] } },
      _sum: {
        quantity: true
      }
    });

    const onHand = roundQty(toNumber(movementTotals._sum.quantity));
    const reserved = roundQty(toNumber(reservationTotals._sum.quantity));
    const available = roundQty(onHand - reserved);

    await this.prisma.stockLevel.upsert({
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

  findAllMaterials() {
    return this.prisma.material.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'desc' },
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

  listMovements() {
    return this.prisma.stockMovement.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        material: true,
        warehouse: true,
        order: true,
        orderItem: true,
        productionJob: true
      }
    });
  }

  async createMovement(dto: CreateStockMovementDto) {
    await this.ensureMaterial(dto.materialId);
    if (dto.warehouseId) {
      await this.ensureWarehouse(dto.warehouseId);
    }

    const totalCost = dto.totalCost ?? roundQty((dto.unitCost ?? 0) * dto.quantity);
    const movement = await this.prisma.stockMovement.create({
      data: {
        materialId: dto.materialId,
        warehouseId: dto.warehouseId,
        orderId: dto.orderId,
        orderItemId: dto.orderItemId,
        productionJobId: dto.productionJobId,
        type: dto.type as StockMovementType,
        quantity: dto.quantity,
        unitCost: dto.unitCost ?? 0,
        totalCost,
        reference: dto.reference,
        note: dto.note
      }
    });

    if (dto.warehouseId) {
      await this.syncStockLevel(dto.materialId, dto.warehouseId);
    }

    return movement;
  }

  async reserve(dto: ReserveStockDto) {
    const material = await this.ensureMaterial(dto.materialId);
    const warehouse = await this.ensureWarehouse(dto.warehouseId);

    const reservation = await this.prisma.stockReservation.create({
      data: {
        orderId: dto.orderId,
        orderItemId: dto.orderItemId,
        materialId: dto.materialId,
        warehouseId: dto.warehouseId,
        quantity: dto.quantity,
        status: 'open',
        note: dto.note
      }
    });

    await this.prisma.stockMovement.create({
      data: {
        materialId: dto.materialId,
        warehouseId: dto.warehouseId,
        orderId: dto.orderId,
        orderItemId: dto.orderItemId,
        type: StockMovementType.reserve,
        quantity: dto.quantity,
        unitCost: toNumber(material.costPrice),
        totalCost: roundQty(toNumber(material.costPrice) * dto.quantity),
        reference: `reserve:${reservation.id}`,
        note: dto.note
      }
    });

    await this.syncStockLevel(material.id, warehouse.id);

    return reservation;
  }

  async writeOff(dto: WriteOffStockDto) {
    const material = await this.ensureMaterial(dto.materialId);
    const warehouseId = dto.warehouseId;
    if (warehouseId) {
      await this.ensureWarehouse(warehouseId);
    }

    const movement = await this.prisma.stockMovement.create({
      data: {
        materialId: dto.materialId,
        warehouseId,
        orderId: dto.orderId,
        productionJobId: dto.productionJobId,
        type: StockMovementType.write_off,
        quantity: dto.quantity,
        unitCost: toNumber(material.costPrice),
        totalCost: roundQty(toNumber(material.costPrice) * dto.quantity),
        note: dto.note
      }
    });

    if (warehouseId) {
      await this.syncStockLevel(material.id, warehouseId);
    }

    return movement;
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
}
