import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { DebtStatus, Prisma, SalesPaymentType } from '@prisma/client';
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
import { aggregateSupplierDebt, recalculatePurchaseEntry } from '../../common/business/purchase-entry';

function resolvePayableStatus(remainingDebt: number) {
  return remainingDebt <= 0 ? DebtStatus.closed : DebtStatus.open;
}

@Injectable()
export class PurchasesService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuditService) private readonly auditService: AuditService
  ) {}

  async listSuppliers() {
    return this.prisma.supplier.findMany({
      where: { deletedAt: null },
      orderBy: { name: 'asc' }
    });
  }

  createSupplier(dto: CreateSupplierDto) {
    return this.prisma.supplier.create({
      data: {
        code: dto.code,
        name: dto.name,
        phone: dto.phone,
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
      data: dto
    });
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

  async findAll(query: PurchaseEntryQueryDto) {
    const { page, limit, skip, take } = normalizePagination(query);
    const where: Prisma.PurchaseEntryWhereInput = {
      deletedAt: null,
      ...(query.search
        ? {
            OR: [
              { supplier: { name: { contains: query.search, mode: 'insensitive' } } },
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
          payable: true
        }
      })
    ]);

    return buildPaginatedResponse(data, total, page, limit);
  }

  async create(dto: CreatePurchaseEntryDto) {
    return this.prisma.$transaction(
      async (tx) => {
        const calculated = recalculatePurchaseEntry(dto.amount, dto.paymentAmount ?? 0);
        const created = await tx.purchaseEntry.create({
          data: {
            supplierId: dto.supplierId,
            date: dto.date ? new Date(dto.date) : new Date(),
            amount: calculated.amount,
            paymentAmount: calculated.paymentAmount,
            remainingDebt: calculated.remainingDebt,
            paymentType: (dto.paymentType as SalesPaymentType | undefined) ?? SalesPaymentType.hesab,
            comment: dto.comment
          }
        });

        await this.syncPayable(tx, created.id);

        await this.auditService.logTx(tx, {
          action: 'purchase_entry.created',
          entityType: 'purchase_entry',
          entityId: created.id,
          afterData: created
        });

        return created;
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

        const calculated = recalculatePurchaseEntry(dto.amount ?? Number(existing.amount), dto.paymentAmount ?? Number(existing.paymentAmount));

        const updated = await tx.purchaseEntry.update({
          where: { id },
          data: {
            supplierId: dto.supplierId ?? existing.supplierId,
            date: dto.date ? new Date(dto.date) : existing.date,
            amount: calculated.amount,
            paymentAmount: calculated.paymentAmount,
            remainingDebt: calculated.remainingDebt,
            paymentType: (dto.paymentType as SalesPaymentType | undefined) ?? existing.paymentType,
            comment: dto.comment ?? existing.comment
          }
        });

        await this.syncPayable(tx, updated.id);

        await this.auditService.logTx(tx, {
          action: 'purchase_entry.updated',
          entityType: 'purchase_entry',
          entityId: updated.id,
          beforeData: existing,
          afterData: updated
        });

        return updated;
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

  async summary() {
    const entries = await this.prisma.purchaseEntry.findMany({
      where: { deletedAt: null },
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

