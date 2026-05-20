import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, OrderStatus, ProductionJobStatus, InvoiceStatus } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateOrderDto, UpdateOrderDto } from './dto/order.dto';
import { OrderListQueryDto } from './dto/order-query.dto';
import { PricingService } from '../pricing/pricing.service';
import { assertOrderStatusTransition } from '../../common/business/order-status';
import { buildOrderListWhere } from '../../common/business/order-filters';
import { buildPaginatedResponse, normalizePagination } from '../../common/query/pagination';
import { calculateOrderProfitability } from '../../common/business/profitability';
import { SalesService } from '../sales/sales.service';
import { UpdateSalesEntryDto } from '../sales/dto/sales.dto';
import { normalizeCreateOrderItem } from '../../common/business/order-items';

function toNumber(value: Prisma.Decimal | number | string | null | undefined) {
  if (value == null) return 0;
  return typeof value === 'number' ? value : Number(value.toString());
}

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

@Injectable()
export class OrdersService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(PricingService) private readonly pricingService: PricingService,
    @Inject(AuditService) private readonly auditService: AuditService,
    @Inject(SalesService) private readonly salesService: SalesService
  ) {}

  private async nextOrderNumber() {
    const sequence = await this.prisma.numberSequence.upsert({
      where: { key: 'order' },
      update: { currentValue: { increment: 1 } },
      create: {
        key: 'order',
        prefix: 'ORD-',
        currentValue: 1,
        step: 1,
        padding: 6
      }
    });

    const value = sequence.currentValue.toString().padStart(sequence.padding, '0');
    return `${sequence.prefix}${value}`;
  }

  private async getOrderOrThrow(id: string) {
    const order = await this.prisma.order.findFirst({
      where: { id, deletedAt: null },
      include: {
        customer: true,
        manager: true,
        createdBy: true,
        items: { include: { material: true } },
        costCalculation: { include: { lines: true } },
        priceVersions: true,
        productionRoutes: { include: { operations: true } },
        productionJobs: true,
        stockReservations: true,
        stockMovements: true,
        invoices: true,
        paymentsIssued: true,
        receivable: true,
        salesEntry: { include: { customer: true, manager: true, order: true, paper: { include: { supplier: true } } } }
      }
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return order;
  }

  async findAll(query: OrderListQueryDto) {
    const { page, limit, skip, take } = normalizePagination(query);
    const where = buildOrderListWhere(query);
    const orderByField = query.sortBy ?? 'createdAt';
    const orderBy = { [orderByField]: query.sortOrder ?? 'desc' } as Prisma.OrderOrderByWithRelationInput;

    const [total, rows] = await this.prisma.$transaction([
      this.prisma.order.count({ where }),
      this.prisma.order.findMany({
        where,
        skip,
        take,
        orderBy,
        include: {
          customer: true,
          manager: true,
          items: true,
          costCalculation: true,
          priceVersions: true,
          productionJobs: true,
          invoices: true,
          receivable: true,
          salesEntry: true
        }
      })
    ]);

    return buildPaginatedResponse(rows, total, page, limit);
  }

  findOne(id: string) {
    return this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findFirst({
        where: { id, deletedAt: null },
        include: {
          customer: true,
          manager: true,
          createdBy: true,
          items: { include: { material: true } },
          costCalculation: { include: { lines: true } },
          priceVersions: true,
          productionRoutes: { include: { operations: true } },
          productionJobs: true,
          stockReservations: true,
          stockMovements: true,
          invoices: true,
          paymentsIssued: true,
          receivable: true,
          salesEntry: { include: { customer: true, manager: true, order: true, paper: { include: { supplier: true } } } }
        }
      });

      if (!order) {
        throw new NotFoundException('Order not found');
      }

      const auditLogs = await this.auditService.findByEntity('order', id);
      const profitability = calculateOrderProfitability({
        totalAmount: Number(order.totalAmount),
        costAmount: Number(order.costAmount),
        paidAmount: Number(order.paidAmount)
      });

      return {
        ...order,
        payments: order.paymentsIssued,
        salesEntry: order.salesEntry,
        auditLogs,
        profitability
      };
    });
  }

  async create(dto: CreateOrderDto) {
    return this.prisma.$transaction(
      async (tx) => {
        let number = dto.number;
        if (!number) {
          const sequence = await tx.numberSequence.upsert({
            where: { key: 'order' },
            update: { currentValue: { increment: 1 } },
            create: {
              key: 'order',
              prefix: 'ORD-',
              currentValue: 1,
              step: 1,
              padding: 6
            }
          });

          number = `${sequence.prefix}${sequence.currentValue.toString().padStart(sequence.padding, '0')}`;
        }

        const items = dto.items ?? [];
        const normalizedItems = items.map((item) => normalizeCreateOrderItem(item as any));
        const totalAmount = roundMoney(normalizedItems.reduce((sum, item) => sum + toNumber(item.totalPrice), 0));

        const order = await tx.order.create({
          data: {
            number,
            customerId: dto.customerId,
            managerId: dto.managerId,
            status: (dto.status as OrderStatus) ?? OrderStatus.draft,
            createdAt: dto.date ? new Date(dto.date) : undefined,
            deadlineAt: dto.deadlineAt ? new Date(dto.deadlineAt) : null,
            comment: dto.comment,
            totalAmount,
            items: normalizedItems.length
              ? {
                  create: normalizedItems.map((item) => ({
                    name: item.name,
                    productType: item.productType,
                    formatText: item.formatText,
                    printColorText: item.printColorText,
                    width: item.width,
                    height: item.height,
                    quantity: item.quantity,
                    colorMode: item.colorMode as any,
                    materialId: item.materialId,
                    finishingOptions: item.finishingOptions as any,
                    unitCost: item.unitCost ?? 0,
                    totalCost: item.totalCost ?? 0,
                    unitPrice: item.unitPrice,
                    totalPrice: item.totalPrice,
                    comment: item.comment
                  }))
                }
              : undefined
          },
          include: {
            items: true,
            customer: true
          }
        });

        await this.auditService.logTx(tx, {
          action: 'order.created',
          entityType: 'order',
          entityId: order.id,
          afterData: order,
          metadata: {
            number: order.number
          }
        });

        await this.salesService.ensureForOrder(tx, order.id);

        return order;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    );
  }

  async update(id: string, dto: UpdateOrderDto) {
    return this.prisma.$transaction(
      async (tx) => {
        const order = await tx.order.findFirst({ where: { id, deletedAt: null } });

        if (!order) {
          throw new NotFoundException('Order not found');
        }

        if (dto.status) {
          assertOrderStatusTransition(order.status, dto.status as OrderStatus);
        }

        const updated = await tx.order.update({
          where: { id },
          data: {
            number: dto.number,
            customerId: dto.customerId,
            managerId: dto.managerId,
            status: dto.status as OrderStatus | undefined,
            deadlineAt: dto.deadlineAt ? new Date(dto.deadlineAt) : undefined,
            comment: dto.comment
          }
        });

        if (dto.status) {
          await this.auditService.logTx(tx, {
            action: 'order.status_changed',
            entityType: 'order',
            entityId: id,
            beforeData: order,
            afterData: updated,
            metadata: {
              nextStatus: dto.status
            }
          });
        }

        await this.salesService.ensureForOrder(tx, id);

        return updated;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    );
  }

  remove(id: string) {
    return this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findFirst({ where: { id, deletedAt: null } });
      if (!order) {
        throw new NotFoundException('Order not found');
      }

      assertOrderStatusTransition(order.status, OrderStatus.cancelled);

      const updated = await tx.order.update({
        where: { id },
        data: {
          status: OrderStatus.cancelled,
          cancelledAt: new Date(),
          deletedAt: new Date()
        }
      });

      await this.auditService.logTx(tx, {
        action: 'order.cancelled',
        entityType: 'order',
        entityId: id,
        beforeData: order,
        afterData: updated
      });

      await this.salesService.ensureForOrder(tx, id);

      return updated;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }

  calculatePrice(id: string) {
    return this.prisma.$transaction(
      async (tx) => {
        const result = await this.pricingService.calculateOrderPrice(id, tx);
        await this.salesService.ensureForOrder(tx, id);
        return result;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    );
  }

  approve(id: string, approvedById?: string) {
    return this.prisma.$transaction(
      async (tx) => {
        const result = await this.pricingService.approvePrice(id, approvedById, tx);
        await this.salesService.ensureForOrder(tx, id);
        return result;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    );
  }

  async startProduction(id: string) {
    return this.prisma.$transaction(
      async (tx) => {
        const order = await tx.order.findFirst({
          where: { id, deletedAt: null },
          include: { productionJobs: true, productionRoutes: true }
        });

        if (!order) {
          throw new NotFoundException('Order not found');
        }

        if (order.status === OrderStatus.in_production) {
          return order.productionJobs[0] ?? null;
        }

        assertOrderStatusTransition(order.status, OrderStatus.in_production);

        const route = order.productionRoutes[0];
        const jobNumber = `JOB-${order.sequenceNo.toString().padStart(6, '0')}`;

        const job = await tx.productionJob.create({
          data: {
            orderId: id,
            routeId: route?.id,
            number: jobNumber,
            status: ProductionJobStatus.in_progress,
            startedAt: new Date()
          }
        });

        const updated = await tx.order.update({
          where: { id },
          data: {
            status: OrderStatus.in_production,
            startedProductionAt: new Date()
          }
        });

        await this.auditService.logTx(tx, {
          action: 'order.status_changed',
          entityType: 'order',
          entityId: id,
          beforeData: { status: order.status },
          afterData: updated,
          metadata: {
            nextStatus: OrderStatus.in_production,
            productionJobId: job.id
          }
        });

        await this.salesService.ensureForOrder(tx, id);

        return job;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    );
  }

  async markReady(id: string) {
    return this.prisma.$transaction(
      async (tx) => {
        const order = await tx.order.findFirst({
          where: { id, deletedAt: null },
          include: { productionJobs: true }
        });

        if (!order) {
          throw new NotFoundException('Order not found');
        }

        if (order.status === OrderStatus.ready) {
          return order;
        }

        assertOrderStatusTransition(order.status, OrderStatus.ready);

        await tx.productionJob.updateMany({
          where: { orderId: id, deletedAt: null },
          data: {
            status: ProductionJobStatus.completed,
            finishedAt: new Date()
          }
        });

        const updated = await tx.order.update({
          where: { id },
          data: {
            status: OrderStatus.ready,
            readyAt: new Date()
          }
        });

        await this.auditService.logTx(tx, {
          action: 'order.status_changed',
          entityType: 'order',
          entityId: id,
          beforeData: { status: order.status },
          afterData: updated,
          metadata: {
            nextStatus: OrderStatus.ready
          }
        });

        await this.salesService.ensureForOrder(tx, id);

        return updated;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    );
  }

  async deliver(id: string) {
    return this.prisma.$transaction(
      async (tx) => {
        const order = await tx.order.findFirst({
          where: { id, deletedAt: null },
          include: { invoices: true, receivable: true }
        });

        if (!order) {
          throw new NotFoundException('Order not found');
        }

        if (order.status === OrderStatus.delivered) {
          return order;
        }

        assertOrderStatusTransition(order.status, OrderStatus.delivered);

        const paidAmount = toNumber(order.paidAmount);
        const totalAmount = toNumber(order.totalAmount);

        await tx.invoice.updateMany({
          where: { orderId: id, deletedAt: null },
          data: {
            status: totalAmount <= paidAmount ? InvoiceStatus.paid : InvoiceStatus.partially_paid,
            closedAt: totalAmount <= paidAmount ? new Date() : null
          }
        });

        const updated = await tx.order.update({
          where: { id },
          data: {
            status: OrderStatus.delivered,
            deliveredAt: new Date(),
            customerDebtAmount: Math.max(totalAmount - paidAmount, 0)
          }
        });

        await this.auditService.logTx(tx, {
          action: 'order.delivered',
          entityType: 'order',
          entityId: id,
          beforeData: { status: order.status, paidAmount },
          afterData: updated
        });

        await this.salesService.ensureForOrder(tx, id);

        return updated;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    );
  }

  async profitability(id: string) {
    const order = await this.getOrderOrThrow(id);
    const totalAmount = toNumber(order.totalAmount);
    const costAmount = toNumber(order.costAmount);
    const profitAmount = toNumber(order.profitAmount);
    const marginPercent = toNumber(order.marginPercent);
    const customerDebtAmount = Math.max(totalAmount - toNumber(order.paidAmount), 0);

    return {
      orderId: id,
      number: order.number,
      totalAmount,
      costAmount,
      profitAmount,
      marginPercent,
      customerDebtAmount,
      netProfit: roundMoney(totalAmount - costAmount),
      isProfitable: totalAmount >= costAmount
    };
  }

  updateHesablama(id: string, dto: UpdateSalesEntryDto) {
    return this.salesService.updateOrderHesablama(id, dto);
  }
}
