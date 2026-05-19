import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, OrderStatus, ProductionJobStatus, InvoiceStatus } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateOrderDto, UpdateOrderDto } from './dto/order.dto';
import { PricingService } from '../pricing/pricing.service';

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
    private readonly prisma: PrismaService,
    private readonly pricingService: PricingService
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
        invoices: true,
        receivable: true
      }
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return order;
  }

  findAll() {
    return this.prisma.order.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'desc' },
      include: {
        customer: true,
        manager: true,
        items: true,
        costCalculation: true,
        priceVersions: true,
        productionJobs: true,
        invoices: true
      }
    });
  }

  findOne(id: string) {
    return this.getOrderOrThrow(id);
  }

  async create(dto: CreateOrderDto) {
    const number = dto.number ?? (await this.nextOrderNumber());
    const items = dto.items ?? [];
    const totalAmount = roundMoney(
      items.reduce((sum, item) => sum + toNumber(item.totalPrice || item.unitPrice * item.quantity), 0)
    );

    return this.prisma.order.create({
      data: {
        number,
        customerId: dto.customerId,
        managerId: dto.managerId,
        status: (dto.status as OrderStatus) ?? OrderStatus.draft,
        deadlineAt: dto.deadlineAt ? new Date(dto.deadlineAt) : null,
        comment: dto.comment,
        totalAmount,
        items: items.length
          ? {
              create: items.map((item) => ({
                name: item.name,
                productType: item.productType,
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
  }

  async update(id: string, dto: UpdateOrderDto) {
    await this.getOrderOrThrow(id);
    return this.prisma.order.update({
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
  }

  remove(id: string) {
    return this.prisma.order.update({
      where: { id },
      data: {
        status: OrderStatus.cancelled,
        cancelledAt: new Date(),
        deletedAt: new Date()
      }
    });
  }

  calculatePrice(id: string) {
    return this.pricingService.calculateOrderPrice(id);
  }

  approve(id: string, approvedById?: string) {
    return this.pricingService.approvePrice(id, approvedById);
  }

  async startProduction(id: string) {
    const order = await this.getOrderOrThrow(id);
    const route = order.productionRoutes[0];
    const jobNumber = `JOB-${order.sequenceNo.toString().padStart(6, '0')}`;

    const job = await this.prisma.productionJob.create({
      data: {
        orderId: id,
        routeId: route?.id,
        number: jobNumber,
        status: ProductionJobStatus.in_progress,
        startedAt: new Date()
      }
    });

    await this.prisma.order.update({
      where: { id },
      data: {
        status: OrderStatus.in_production,
        startedProductionAt: new Date()
      }
    });

    return job;
  }

  async markReady(id: string) {
    await this.getOrderOrThrow(id);
    await this.prisma.productionJob.updateMany({
      where: { orderId: id, deletedAt: null },
      data: {
        status: ProductionJobStatus.completed,
        finishedAt: new Date()
      }
    });

    return this.prisma.order.update({
      where: { id },
      data: {
        status: OrderStatus.ready,
        readyAt: new Date()
      }
    });
  }

  async deliver(id: string) {
    const order = await this.getOrderOrThrow(id);
    const paidAmount = toNumber(order.paidAmount);
    const totalAmount = toNumber(order.totalAmount);

    await this.prisma.invoice.updateMany({
      where: { orderId: id, deletedAt: null },
      data: {
        status: totalAmount <= paidAmount ? InvoiceStatus.paid : InvoiceStatus.partially_paid,
        closedAt: totalAmount <= paidAmount ? new Date() : null
      }
    });

    return this.prisma.order.update({
      where: { id },
      data: {
        status: OrderStatus.delivered,
        deliveredAt: new Date(),
        customerDebtAmount: Math.max(totalAmount - paidAmount, 0)
      }
    });
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
}
