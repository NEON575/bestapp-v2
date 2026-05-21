import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { DebtStatus, Prisma, SalesPaymentType, StockMovementType } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { buildPaginatedResponse, normalizePagination } from '../../common/query/pagination';
import {
  CreatePurchaseEntryDto,
  CreateSupplierDto,
  PurchaseEntryQueryDto,
  UpdatePurchaseEntryDto,
  UpdateSupplierDto
} from './dto/purchases.dto';
import { aggregateSupplierDebt } from '../../common/business/purchase-entry';
import { recalculatePurchaseFlow } from '../../common/business/purchase-flow';
import { InventoryService } from '../inventory/inventory.service';

function toNumber(value: Prisma.Decimal | number | string | null | undefined) {
  if (value == null) return 0;
  return typeof value === 'number' ? value : Number(value.toString());
}

function resolvePayableStatus(remainingDebt: number) {
  return remainingDebt <= 0 ? DebtStatus.closed : DebtStatus.open;
}

@Injectable()
export class PurchasesService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuditService) private readonly auditService: AuditService,
    @Inject(InventoryService) private readonly inventoryService: InventoryService
  ) {}

  async listSuppliers() {
    return this.prisma.supplier.findMany({
      where: { deletedAt: null },
      orderBy: [{ isActive: 'desc' }, { name: 'asc' }]
    });
  }

  createSupplier(dto: CreateSupplierDto) {
    return this.prisma.supplier.create({
      data: {
        code: dto.code,
        name: dto.name,
        phone: dto.phone,
        taxId: dto.taxId,
        email: dto.email,
        address: dto.address,
        notes: dto.notes,
        isActive: dto.isActive ?? true
      }
    });
  }

  updateSupplier(id: string, dto: UpdateSupplierDto) {
    return this.prisma.supplier.update({
      where: { id },
      data: {
        code: dto.code,
        name: dto.name,
        phone: dto.phone,
        taxId: dto.taxId,
        email: dto.email,
        address: dto.address,
        notes: dto.notes,
        isActive: dto.isActive
      }
    });
  }

  removeSupplier(id: string) {
    return this.prisma.supplier.update({
      where: { id },
      data: {
        isActive: false,
        deletedAt: new Date()
      }
    });
  }

  private async ensureMaterial(tx: Prisma.TransactionClient, materialId: string) {
    const material = await tx.material.findFirst({
      where: { id: materialId, deletedAt: null }
    });

    if (!material) {
      throw new NotFoundException('Material not found');
    }

    return material;
  }

  private async resolveWarehouseId(tx: Prisma.TransactionClient, requestedWarehouseId?: string) {
    if (requestedWarehouseId) {
      const warehouse = await tx.warehouse.findFirst({
        where: { id: requestedWarehouseId, deletedAt: null, isActive: true }
      });

      if (!warehouse) {
        throw new NotFoundException('Warehouse not found');
      }

      return warehouse.id;
    }

    const defaultWarehouse = await tx.warehouse.findFirst({
      where: { deletedAt: null, isActive: true },
      orderBy: { createdAt: 'asc' }
    });

    if (!defaultWarehouse) {
      throw new NotFoundException('Warehouse not found');
    }

    return defaultWarehouse.id;
  }

  private async syncPayable(tx: Prisma.TransactionClient, purchaseEntryId: string) {
    const purchase = await tx.purchaseEntry.findUnique({
      where: { id: purchaseEntryId },
      include: { supplier: true, payable: true }
    });

    if (!purchase) {
      throw new NotFoundException('Purchase entry not found');
    }

    const payable = purchase.payable
      ? await tx.payable.update({
          where: { id: purchase.payable.id },
          data: {
            supplierId: purchase.supplierId,
            counterpartyName: purchase.supplier.name,
            amount: purchase.amount,
            paidAmount: purchase.paymentAmount,
            purchaseReference: purchase.id,
            status: resolvePayableStatus(Number(purchase.remainingDebt))
          }
        })
      : await tx.payable.create({
          data: {
            supplierId: purchase.supplierId,
            purchaseEntryId: purchase.id,
            counterpartyName: purchase.supplier.name,
            purchaseReference: purchase.id,
            amount: purchase.amount,
            paidAmount: purchase.paymentAmount,
            status: resolvePayableStatus(Number(purchase.remainingDebt))
          }
        });

    if (!purchase.payableId || purchase.payableId !== payable.id) {
      await tx.purchaseEntry.update({
        where: { id: purchase.id },
        data: { payableId: payable.id }
      });
    }
  }

  private async syncPurchaseMovement(tx: Prisma.TransactionClient, purchaseEntryId: string, previousState?: { materialId: string; warehouseId: string | null }) {
    const purchase = await tx.purchaseEntry.findUnique({
      where: { id: purchaseEntryId }
    });

    if (!purchase || !purchase.materialId) {
      throw new NotFoundException('Purchase entry not found');
    }

    const movement = await tx.stockMovement.findFirst({
      where: { purchaseEntryId: purchase.id, type: StockMovementType.purchase_in }
    });

    if (movement) {
      await tx.stockMovement.update({
        where: { id: movement.id },
        data: {
          materialId: purchase.materialId,
          warehouseId: purchase.warehouseId,
          type: StockMovementType.purchase_in,
          quantity: purchase.totalQuantity,
          balanceDelta: purchase.totalQuantity,
          unitCost: purchase.unitPrice,
          totalCost: purchase.amount,
          reference: `purchase:${purchase.id}`,
          note: purchase.comment,
          createdAt: purchase.date
        }
      });
    } else {
      await tx.stockMovement.create({
        data: {
          purchaseEntryId: purchase.id,
          materialId: purchase.materialId,
          warehouseId: purchase.warehouseId,
          type: StockMovementType.purchase_in,
          quantity: purchase.totalQuantity,
          balanceDelta: purchase.totalQuantity,
          unitCost: purchase.unitPrice,
          totalCost: purchase.amount,
          reference: `purchase:${purchase.id}`,
          note: purchase.comment,
          createdAt: purchase.date
        }
      });
    }

    if (previousState?.warehouseId) {
      await this.inventoryService.syncStockLevel(previousState.materialId, previousState.warehouseId, tx);
      await this.inventoryService.refreshMaterialSnapshots(previousState.materialId, tx);
    }

    if (purchase.warehouseId) {
      await this.inventoryService.syncStockLevel(purchase.materialId, purchase.warehouseId, tx);
    }
    await this.inventoryService.refreshMaterialSnapshots(purchase.materialId, tx);
  }

  async findAll(query: PurchaseEntryQueryDto) {
    const { page, limit, skip, take } = normalizePagination(query);
    const where: Prisma.PurchaseEntryWhereInput = {
      deletedAt: null,
      ...(query.search
        ? {
            OR: [
              { supplier: { name: { contains: query.search, mode: 'insensitive' } } },
              { material: { name: { contains: query.search, mode: 'insensitive' } } },
              { material: { sku: { contains: query.search, mode: 'insensitive' } } },
              { comment: { contains: query.search, mode: 'insensitive' } }
            ]
          }
        : {}),
      ...(query.supplierId ? { supplierId: query.supplierId } : {}),
      ...(query.paymentType ? { paymentType: query.paymentType as SalesPaymentType } : {}),
      ...(query.onlyDebtors ? { remainingDebt: { gt: 0 } } : {}),
      ...(query.dateFrom || query.dateTo
        ? {
            date: {
              gte: query.dateFrom ? new Date(query.dateFrom) : undefined,
              lte: query.dateTo ? new Date(query.dateTo) : undefined
            }
          }
        : {})
    };

    const orderBy = { [query.sortBy ?? 'date']: query.sortOrder ?? 'desc' } as Prisma.PurchaseEntryOrderByWithRelationInput;

    const [total, data] = await this.prisma.$transaction([
      this.prisma.purchaseEntry.count({ where }),
      this.prisma.purchaseEntry.findMany({
        where,
        skip,
        take,
        orderBy,
        include: {
          supplier: true,
          material: true,
          warehouse: true,
          payable: true
        }
      })
    ]);

    return buildPaginatedResponse(data, total, page, limit);
  }

  async quickCreate(dto: CreatePurchaseEntryDto) {
    return this.create(dto);
  }

  async create(dto: CreatePurchaseEntryDto) {
    return this.prisma.$transaction(
      async (tx) => {
        const material = await this.ensureMaterial(tx, dto.materialId);
        const warehouseId = await this.resolveWarehouseId(tx, dto.warehouseId);
        const calculated = recalculatePurchaseFlow({
          quantity: dto.quantity,
          packageQuantity: dto.packageQuantity,
          unitsPerPackage: dto.unitsPerPackage,
          unitPrice: dto.unitPrice,
          totalAmount: dto.amount,
          paymentAmount: dto.paymentAmount
        });

        const created = await tx.purchaseEntry.create({
          data: {
            supplierId: dto.supplierId,
            materialId: dto.materialId,
            warehouseId,
            date: dto.date ? new Date(dto.date) : new Date(),
            stockUnit: dto.stockUnit || material.stockUnit || material.unit,
            packageUnit: dto.packageUnit,
            unitsPerPackage: dto.unitsPerPackage ?? null,
            packageQuantity: dto.packageQuantity ?? null,
            totalQuantity: calculated.totalQuantity,
            unitPrice: calculated.unitPrice,
            amount: calculated.totalAmount,
            paymentAmount: calculated.paymentAmount,
            remainingDebt: calculated.remainingDebt,
            paymentType: (dto.paymentType as SalesPaymentType | undefined) ?? SalesPaymentType.hesab,
            comment: dto.comment
          }
        });

        await this.syncPurchaseMovement(tx, created.id);
        await this.syncPayable(tx, created.id);

        await this.auditService.logTx(tx, {
          action: 'purchase_entry.created',
          entityType: 'purchase_entry',
          entityId: created.id,
          afterData: created
        });

        return tx.purchaseEntry.findUniqueOrThrow({
          where: { id: created.id },
          include: { supplier: true, material: true, warehouse: true, payable: true }
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    );
  }

  async update(id: string, dto: UpdatePurchaseEntryDto) {
    return this.prisma.$transaction(
      async (tx) => {
        const existing = await tx.purchaseEntry.findFirst({
          where: { id, deletedAt: null }
        });

        if (!existing) {
          throw new NotFoundException('Purchase entry not found');
        }

        const materialId = dto.materialId ?? existing.materialId;
        if (!materialId) {
          throw new NotFoundException('Material not found');
        }

        const material = await this.ensureMaterial(tx, materialId);
        const warehouseId = await this.resolveWarehouseId(tx, dto.warehouseId ?? existing.warehouseId ?? undefined);
        const calculated = recalculatePurchaseFlow({
          quantity: dto.quantity ?? toNumber(existing.totalQuantity),
          packageQuantity: dto.packageQuantity ?? toNumber(existing.packageQuantity),
          unitsPerPackage: dto.unitsPerPackage ?? toNumber(existing.unitsPerPackage),
          unitPrice: dto.unitPrice ?? toNumber(existing.unitPrice),
          totalAmount: dto.amount ?? toNumber(existing.amount),
          paymentAmount: dto.paymentAmount ?? toNumber(existing.paymentAmount)
        });

        const updated = await tx.purchaseEntry.update({
          where: { id },
          data: {
            supplierId: dto.supplierId ?? existing.supplierId,
            materialId,
            warehouseId,
            date: dto.date ? new Date(dto.date) : existing.date,
            stockUnit: dto.stockUnit ?? existing.stockUnit ?? material.stockUnit ?? material.unit,
            packageUnit: dto.packageUnit ?? existing.packageUnit,
            unitsPerPackage: dto.unitsPerPackage ?? existing.unitsPerPackage,
            packageQuantity: dto.packageQuantity ?? existing.packageQuantity,
            totalQuantity: calculated.totalQuantity,
            unitPrice: calculated.unitPrice,
            amount: calculated.totalAmount,
            paymentAmount: calculated.paymentAmount,
            remainingDebt: calculated.remainingDebt,
            paymentType: (dto.paymentType as SalesPaymentType | undefined) ?? existing.paymentType,
            comment: dto.comment ?? existing.comment
          }
        });

        await this.syncPurchaseMovement(tx, updated.id, {
          materialId: existing.materialId ?? materialId,
          warehouseId: existing.warehouseId
        });
        await this.syncPayable(tx, updated.id);

        await this.auditService.logTx(tx, {
          action: 'purchase_entry.updated',
          entityType: 'purchase_entry',
          entityId: updated.id,
          beforeData: existing,
          afterData: updated
        });

        return tx.purchaseEntry.findUniqueOrThrow({
          where: { id: updated.id },
          include: { supplier: true, material: true, warehouse: true, payable: true }
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    );
  }

  remove(id: string) {
    return this.prisma.purchaseEntry.update({
      where: { id },
      data: { deletedAt: new Date() }
    });
  }

  async summary(query: Partial<PurchaseEntryQueryDto> = {}) {
    const entries = await this.prisma.purchaseEntry.findMany({
      where: {
        deletedAt: null,
        ...(query.search
          ? {
              OR: [
                { supplier: { name: { contains: query.search, mode: 'insensitive' } } },
                { material: { name: { contains: query.search, mode: 'insensitive' } } },
                { comment: { contains: query.search, mode: 'insensitive' } }
              ]
            }
          : {}),
        ...(query.supplierId ? { supplierId: query.supplierId } : {}),
        ...(query.paymentType ? { paymentType: query.paymentType as SalesPaymentType } : {}),
        ...(query.onlyDebtors ? { remainingDebt: { gt: 0 } } : {}),
        ...(query.dateFrom || query.dateTo
          ? {
              date: {
                gte: query.dateFrom ? new Date(query.dateFrom) : undefined,
                lte: query.dateTo ? new Date(query.dateTo) : undefined
              }
            }
          : {})
      },
      include: { supplier: true }
    });

    const supplierTotals = aggregateSupplierDebt(
      entries.map((entry) => ({
        supplierId: entry.supplierId,
        supplierName: entry.supplier.name,
        amount: entry.amount,
        paymentAmount: entry.paymentAmount,
        remainingDebt: entry.remainingDebt
      }))
    );

    return {
      totalPurchaseAmount: entries.reduce((sum, entry) => sum + Number(entry.amount), 0),
      totalPaymentAmount: entries.reduce((sum, entry) => sum + Number(entry.paymentAmount), 0),
      totalSupplierDebt: entries.reduce((sum, entry) => sum + Number(entry.remainingDebt), 0),
      supplierTotals
    };
  }

  async supplierDebts(supplierId?: string) {
    const entries = await this.prisma.purchaseEntry.findMany({
      where: {
        deletedAt: null,
        ...(supplierId ? { supplierId } : {})
      },
      include: { supplier: true }
    });

    return aggregateSupplierDebt(
      entries.map((entry) => ({
        supplierId: entry.supplierId,
        supplierName: entry.supplier.name,
        amount: entry.amount,
        paymentAmount: entry.paymentAmount,
        remainingDebt: entry.remainingDebt
      }))
    );
  }
}
