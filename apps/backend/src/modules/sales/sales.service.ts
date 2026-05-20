import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { OrderStatus, Prisma, SalesDeliveryStatus, SalesPaymentType } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { buildPaginatedResponse, normalizePagination } from '../../common/query/pagination';
import { recalculateSalesEntry, aggregateCustomerDebt } from '../../common/business/sales-entry';
import { mapOrderStatusToProductionStage, mapOrderStatusToSalesDeliveryStatus } from '../../common/business/sales-mapping';
import { CreateSalesEntryDto, SalesEntryQueryDto, UpdateSalesEntryDto } from './dto/sales.dto';

function toNumber(value: Prisma.Decimal | number | string | null | undefined) {
  if (value == null) return 0;
  return typeof value === 'number' ? value : Number(value.toString());
}

function toDate(value?: string | Date | null) {
  if (!value) return null;
  return value instanceof Date ? value : new Date(value);
}

@Injectable()
export class SalesService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuditService) private readonly auditService: AuditService
  ) {}

  private db(tx?: Prisma.TransactionClient) {
    return tx ?? this.prisma;
  }

  private buildCalculatedData(
    dto: Partial<CreateSalesEntryDto> & {
      customerId: string;
      productName: string;
      quantity: number;
      saleAmount: number;
    }
  ) {
    const calculated = recalculateSalesEntry(dto);

    return {
      orderId: dto.orderId,
      customerId: dto.customerId,
      managerId: dto.managerId,
      paperId: dto.paperId,
      date: dto.date ? new Date(dto.date) : undefined,
      category: dto.category,
      productName: dto.productName,
      quantity: dto.quantity,
      saleAmount: dto.saleAmount,
      saleUnitPrice: calculated.saleUnitPrice,
      paymentAmount: dto.paymentAmount ?? 0,
      paymentType: (dto.paymentType as SalesPaymentType | undefined) ?? SalesPaymentType.negd,
      bonus: dto.bonus ?? 0,
      customerBonus: dto.customerBonus ?? 0,
      remainingDebt: calculated.remainingDebt,
      finalRemainingDebt: calculated.finalRemainingDebt,
      productionStage: dto.productionStage as any,
      deliveryStatus: dto.deliveryStatus as SalesDeliveryStatus | undefined,
      deliveryDate: dto.deliveryDate ? new Date(dto.deliveryDate) : undefined,
      paymentStatus: dto.paymentStatus as any,
      qaimaStatus: dto.qaimaStatus as any,
      qaimaDate: dto.qaimaDate ? new Date(dto.qaimaDate) : undefined,
      qaimaNumber: dto.qaimaNumber,
      printColor: dto.printColor as any,
      printType: dto.printType as any,
      paperCost: dto.paperCost ?? 0,
      plateCost: dto.plateCost ?? 0,
      printCost: dto.printCost ?? 0,
      specialCutCost: dto.specialCutCost ?? 0,
      knifeCost: dto.knifeCost ?? 0,
      manualWorkCost: dto.manualWorkCost ?? 0,
      spiralCost: dto.spiralCost ?? 0,
      poniCost: dto.poniCost ?? 0,
      otherCost: dto.otherCost ?? 0,
      laminationCost: dto.laminationCost ?? 0,
      totalCost: calculated.totalCost,
      profit: calculated.profit,
      profitPercent: calculated.profitPercent,
      spiralType: dto.spiralType,
      spiralQuantity: dto.spiralQuantity,
      spiralUnitCost: dto.spiralUnitCost,
      spiralTotalCost: dto.spiralTotalCost,
      invoiceStatusText: dto.invoiceStatusText,
      notes: dto.notes
    };
  }

  private async syncOrderFinancials(tx: Prisma.TransactionClient, salesEntryId: string) {
    const salesEntry = await tx.salesEntry.findUnique({
      where: { id: salesEntryId }
    });

    if (!salesEntry?.orderId) {
      return salesEntry;
    }

    await tx.order.update({
      where: { id: salesEntry.orderId },
      data: {
        totalAmount: salesEntry.saleAmount,
        paidAmount: salesEntry.paymentAmount,
        customerDebtAmount: salesEntry.finalRemainingDebt,
        costAmount: salesEntry.totalCost,
        profitAmount: salesEntry.profit,
        marginPercent: salesEntry.profitPercent
      }
    });

    return salesEntry;
  }

  async ensureForOrder(tx: Prisma.TransactionClient, orderId: string) {
    const order = await tx.order.findFirst({
      where: { id: orderId, deletedAt: null },
      include: {
        items: true,
        salesEntry: true
      }
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    const quantity =
      order.salesEntry?.quantity != null
        ? toNumber(order.salesEntry.quantity)
        : order.items.reduce((sum, item) => sum + toNumber(item.quantity), 0);
    const firstItem = order.items[0];

    const payload = this.buildCalculatedData({
      orderId: order.id,
      customerId: order.customerId,
      managerId: order.managerId ?? undefined,
      category: order.salesEntry?.category ?? firstItem?.productType ?? undefined,
      productName: order.salesEntry?.productName ?? firstItem?.name ?? order.number,
      quantity,
      saleAmount: toNumber(order.totalAmount),
      paymentAmount: toNumber(order.paidAmount),
      paymentType: order.salesEntry?.paymentType ?? SalesPaymentType.negd,
      bonus: toNumber(order.salesEntry?.bonus),
      customerBonus: toNumber(order.salesEntry?.customerBonus),
      productionStage: order.salesEntry?.productionStage ?? mapOrderStatusToProductionStage(order.status),
      deliveryStatus: mapOrderStatusToSalesDeliveryStatus(order.status),
      deliveryDate: toDate(order.deliveredAt)?.toISOString(),
      paymentStatus: order.salesEntry?.paymentStatus ?? undefined,
      qaimaStatus: order.salesEntry?.qaimaStatus ?? undefined,
      qaimaDate: toDate(order.salesEntry?.qaimaDate)?.toISOString(),
      qaimaNumber: order.salesEntry?.qaimaNumber ?? undefined,
      printColor: order.salesEntry?.printColor ?? undefined,
      printType: order.salesEntry?.printType ?? undefined,
      paperId: order.salesEntry?.paperId ?? undefined,
      paperCost: toNumber(order.salesEntry?.paperCost),
      plateCost: toNumber(order.salesEntry?.plateCost),
      printCost: toNumber(order.salesEntry?.printCost),
      specialCutCost: toNumber(order.salesEntry?.specialCutCost),
      knifeCost: toNumber(order.salesEntry?.knifeCost),
      manualWorkCost: toNumber(order.salesEntry?.manualWorkCost),
      spiralCost: toNumber(order.salesEntry?.spiralCost),
      poniCost: toNumber(order.salesEntry?.poniCost),
      otherCost: toNumber(order.salesEntry?.otherCost),
      laminationCost: toNumber(order.salesEntry?.laminationCost),
      spiralType: order.salesEntry?.spiralType ?? undefined,
      spiralQuantity: toNumber(order.salesEntry?.spiralQuantity),
      spiralUnitCost: toNumber(order.salesEntry?.spiralUnitCost),
      spiralTotalCost: toNumber(order.salesEntry?.spiralTotalCost),
      invoiceStatusText: order.salesEntry?.invoiceStatusText ?? undefined,
      notes: order.salesEntry?.notes ?? undefined
    });

    const salesEntry = order.salesEntry
      ? await tx.salesEntry.update({
          where: { id: order.salesEntry.id },
          data: payload
        })
      : await tx.salesEntry.create({
          data: payload
        });

    await this.syncOrderFinancials(tx, salesEntry.id);
    return salesEntry;
  }

  async findAll(query: SalesEntryQueryDto) {
    const { page, limit, skip, take } = normalizePagination(query);
    const where: Prisma.SalesEntryWhereInput = {
      deletedAt: null,
      ...(query.search
        ? {
            OR: [
              { productName: { contains: query.search, mode: 'insensitive' } },
              { category: { contains: query.search, mode: 'insensitive' } },
              { customer: { name: { contains: query.search, mode: 'insensitive' } } },
              { manager: { fullName: { contains: query.search, mode: 'insensitive' } } },
              { qaimaNumber: { contains: query.search, mode: 'insensitive' } }
            ]
          }
        : {}),
      ...(query.customerId ? { customerId: query.customerId } : {}),
      ...(query.managerId ? { managerId: query.managerId } : {}),
      ...(query.paymentType ? { paymentType: query.paymentType as SalesPaymentType } : {}),
      ...(query.deliveryStatus ? { deliveryStatus: query.deliveryStatus as SalesDeliveryStatus } : {}),
      ...(query.productionStage ? { productionStage: query.productionStage as any } : {}),
      ...(query.hasDebt ? { finalRemainingDebt: { gt: 0 } } : {}),
      ...(query.dateFrom || query.dateTo
        ? {
            date: {
              gte: query.dateFrom ? new Date(query.dateFrom) : undefined,
              lte: query.dateTo ? new Date(query.dateTo) : undefined
            }
          }
        : {})
    };

    const orderBy = { [query.sortBy ?? 'date']: query.sortOrder ?? 'desc' } as Prisma.SalesEntryOrderByWithRelationInput;

    const [total, data] = await this.prisma.$transaction([
      this.prisma.salesEntry.count({ where }),
      this.prisma.salesEntry.findMany({
        where,
        skip,
        take,
        orderBy,
        include: {
          customer: true,
          manager: true,
          order: true,
          paper: { include: { supplier: true } }
        }
      })
    ]);

    return buildPaginatedResponse(data, total, page, limit);
  }

  async findOne(id: string) {
    const entry = await this.prisma.salesEntry.findFirst({
      where: { id, deletedAt: null },
      include: {
        customer: true,
        manager: true,
        order: true,
        paper: { include: { supplier: true } }
      }
    });

    if (!entry) {
      throw new NotFoundException('Sales entry not found');
    }

    return entry;
  }

  async create(dto: CreateSalesEntryDto) {
    return this.prisma.$transaction(
      async (tx) => {
        const created = await tx.salesEntry.create({
          data: this.buildCalculatedData(dto)
        });

        await this.syncOrderFinancials(tx, created.id);

        await this.auditService.logTx(tx, {
          action: 'sales_entry.created',
          entityType: 'sales_entry',
          entityId: created.id,
          afterData: created
        });

        return this.findOne(created.id);
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    );
  }

  async update(id: string, dto: UpdateSalesEntryDto) {
    return this.prisma.$transaction(
      async (tx) => {
        const existing = await tx.salesEntry.findFirst({
          where: { id, deletedAt: null }
        });

        if (!existing) {
          throw new NotFoundException('Sales entry not found');
        }

        const updated = await tx.salesEntry.update({
          where: { id },
          data: this.buildCalculatedData({
            orderId: dto.orderId ?? existing.orderId ?? undefined,
            customerId: dto.customerId ?? existing.customerId,
            managerId: dto.managerId ?? existing.managerId ?? undefined,
            paperId: dto.paperId ?? existing.paperId ?? undefined,
            date: dto.date ?? existing.date.toISOString(),
            category: dto.category ?? existing.category ?? undefined,
            productName: dto.productName ?? existing.productName,
            quantity: dto.quantity ?? toNumber(existing.quantity),
            saleAmount: dto.saleAmount ?? toNumber(existing.saleAmount),
            paymentAmount: dto.paymentAmount ?? toNumber(existing.paymentAmount),
            paymentType: dto.paymentType ?? existing.paymentType,
            bonus: dto.bonus ?? toNumber(existing.bonus),
            customerBonus: dto.customerBonus ?? toNumber(existing.customerBonus),
            productionStage: dto.productionStage ?? existing.productionStage ?? undefined,
            deliveryStatus: dto.deliveryStatus ?? existing.deliveryStatus,
            deliveryDate: dto.deliveryDate ?? existing.deliveryDate?.toISOString(),
            paymentStatus: dto.paymentStatus ?? existing.paymentStatus ?? undefined,
            qaimaStatus: dto.qaimaStatus ?? existing.qaimaStatus ?? undefined,
            qaimaDate: dto.qaimaDate ?? existing.qaimaDate?.toISOString(),
            qaimaNumber: dto.qaimaNumber ?? existing.qaimaNumber ?? undefined,
            printColor: dto.printColor ?? existing.printColor ?? undefined,
            printType: dto.printType ?? existing.printType ?? undefined,
            paperCost: dto.paperCost ?? toNumber(existing.paperCost),
            plateCost: dto.plateCost ?? toNumber(existing.plateCost),
            printCost: dto.printCost ?? toNumber(existing.printCost),
            specialCutCost: dto.specialCutCost ?? toNumber(existing.specialCutCost),
            knifeCost: dto.knifeCost ?? toNumber(existing.knifeCost),
            manualWorkCost: dto.manualWorkCost ?? toNumber(existing.manualWorkCost),
            spiralCost: dto.spiralCost ?? toNumber(existing.spiralCost),
            poniCost: dto.poniCost ?? toNumber(existing.poniCost),
            otherCost: dto.otherCost ?? toNumber(existing.otherCost),
            laminationCost: dto.laminationCost ?? toNumber(existing.laminationCost),
            spiralType: dto.spiralType ?? existing.spiralType ?? undefined,
            spiralQuantity: dto.spiralQuantity ?? toNumber(existing.spiralQuantity),
            spiralUnitCost: dto.spiralUnitCost ?? toNumber(existing.spiralUnitCost),
            spiralTotalCost: dto.spiralTotalCost ?? toNumber(existing.spiralTotalCost),
            invoiceStatusText: dto.invoiceStatusText ?? existing.invoiceStatusText ?? undefined,
            notes: dto.notes ?? existing.notes ?? undefined
          })
        });

        await this.syncOrderFinancials(tx, updated.id);

        await this.auditService.logTx(tx, {
          action: 'sales_entry.updated',
          entityType: 'sales_entry',
          entityId: updated.id,
          beforeData: existing,
          afterData: updated
        });

        return this.findOne(updated.id);
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    );
  }

  async remove(id: string) {
    return this.prisma.salesEntry.update({
      where: { id },
      data: {
        deletedAt: new Date()
      }
    });
  }

  async updateOrderHesablama(orderId: string, dto: UpdateSalesEntryDto) {
    return this.prisma.$transaction(
      async (tx) => {
        const ensured = await this.ensureForOrder(tx, orderId);
        const updated = await tx.salesEntry.update({
          where: { id: ensured.id },
          data: this.buildCalculatedData({
            orderId,
            customerId: dto.customerId ?? ensured.customerId,
            managerId: dto.managerId ?? ensured.managerId ?? undefined,
            paperId: dto.paperId ?? ensured.paperId ?? undefined,
            date: dto.date ?? ensured.date.toISOString(),
            category: dto.category ?? ensured.category ?? undefined,
            productName: dto.productName ?? ensured.productName,
            quantity: dto.quantity ?? toNumber(ensured.quantity),
            saleAmount: dto.saleAmount ?? toNumber(ensured.saleAmount),
            paymentAmount: dto.paymentAmount ?? toNumber(ensured.paymentAmount),
            paymentType: dto.paymentType ?? ensured.paymentType,
            bonus: dto.bonus ?? toNumber(ensured.bonus),
            customerBonus: dto.customerBonus ?? toNumber(ensured.customerBonus),
            productionStage: dto.productionStage ?? ensured.productionStage ?? undefined,
            deliveryStatus: dto.deliveryStatus ?? ensured.deliveryStatus,
            deliveryDate: dto.deliveryDate ?? ensured.deliveryDate?.toISOString(),
            paymentStatus: dto.paymentStatus ?? ensured.paymentStatus ?? undefined,
            qaimaStatus: dto.qaimaStatus ?? ensured.qaimaStatus ?? undefined,
            qaimaDate: dto.qaimaDate ?? ensured.qaimaDate?.toISOString(),
            qaimaNumber: dto.qaimaNumber ?? ensured.qaimaNumber ?? undefined,
            printColor: dto.printColor ?? ensured.printColor ?? undefined,
            printType: dto.printType ?? ensured.printType ?? undefined,
            paperCost: dto.paperCost ?? toNumber(ensured.paperCost),
            plateCost: dto.plateCost ?? toNumber(ensured.plateCost),
            printCost: dto.printCost ?? toNumber(ensured.printCost),
            specialCutCost: dto.specialCutCost ?? toNumber(ensured.specialCutCost),
            knifeCost: dto.knifeCost ?? toNumber(ensured.knifeCost),
            manualWorkCost: dto.manualWorkCost ?? toNumber(ensured.manualWorkCost),
            spiralCost: dto.spiralCost ?? toNumber(ensured.spiralCost),
            poniCost: dto.poniCost ?? toNumber(ensured.poniCost),
            otherCost: dto.otherCost ?? toNumber(ensured.otherCost),
            laminationCost: dto.laminationCost ?? toNumber(ensured.laminationCost),
            spiralType: dto.spiralType ?? ensured.spiralType ?? undefined,
            spiralQuantity: dto.spiralQuantity ?? toNumber(ensured.spiralQuantity),
            spiralUnitCost: dto.spiralUnitCost ?? toNumber(ensured.spiralUnitCost),
            spiralTotalCost: dto.spiralTotalCost ?? toNumber(ensured.spiralTotalCost),
            invoiceStatusText: dto.invoiceStatusText ?? ensured.invoiceStatusText ?? undefined,
            notes: dto.notes ?? ensured.notes ?? undefined
          })
        });

        await this.syncOrderFinancials(tx, updated.id);

        await this.auditService.logTx(tx, {
          action: 'sales_entry.hesablama_updated',
          entityType: 'sales_entry',
          entityId: updated.id,
          beforeData: ensured,
          afterData: updated,
          metadata: {
            orderId
          }
        });

        return updated;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    );
  }

  async dashboard() {
    const entries = await this.prisma.salesEntry.findMany({
      where: { deletedAt: null },
      include: {
        customer: true,
        manager: true,
        order: true,
        paper: true
      },
      orderBy: { date: 'desc' }
    });

    const totalSalesAmount = entries.reduce((sum, item) => sum + toNumber(item.saleAmount), 0);
    const totalPayments = entries.reduce((sum, item) => sum + toNumber(item.paymentAmount), 0);
    const totalDebt = entries.reduce((sum, item) => sum + toNumber(item.finalRemainingDebt), 0);
    const totalProfit = entries.reduce((sum, item) => sum + toNumber(item.profit), 0);
    const averageMarginPercent = entries.length
      ? entries.reduce((sum, item) => sum + toNumber(item.profitPercent), 0) / entries.length
      : 0;

    return {
      totalSalesAmount,
      totalPayments,
      totalDebt,
      totalProfit,
      averageMarginPercent: Math.round(averageMarginPercent * 100) / 100,
      entries: entries.length,
      recentEntries: entries.slice(0, 10)
    };
  }

  async customerDebts(customerId?: string) {
    const entries = await this.prisma.salesEntry.findMany({
      where: {
        deletedAt: null,
        ...(customerId ? { customerId } : {})
      },
      include: {
        customer: true
      }
    });

    return aggregateCustomerDebt(
      entries.map((entry) => ({
        customerId: entry.customerId,
        customerName: entry.customer.name,
        saleAmount: entry.saleAmount,
        paymentAmount: entry.paymentAmount,
        bonus: entry.bonus,
        customerBonus: entry.customerBonus,
        remainingDebt: entry.remainingDebt,
        finalRemainingDebt: entry.finalRemainingDebt
      }))
    );
  }
}
