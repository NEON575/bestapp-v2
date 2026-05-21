import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { OrderStatus, Prisma, StockReservationStatus } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { assertOrderStatusTransition } from '../../common/business/order-status';
import { PrismaService } from '../../common/prisma/prisma.service';
import { resolveApprovedById } from '../../common/business/pricing-approval';

function toNumber(value: Prisma.Decimal | number | string | null | undefined) {
  if (value == null) return 0;
  return typeof value === 'number' ? value : Number(value.toString());
}

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

@Injectable()
export class PricingService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuditService) private readonly auditService: AuditService
  ) {}

  private db(tx?: Prisma.TransactionClient) {
    return tx ?? this.prisma;
  }

  private parseFinishingOptions(value: Prisma.JsonValue | null | undefined) {
    if (!value) return 0;
    if (Array.isArray(value)) return value.length;
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed)) return parsed.length;
      } catch {
        return value.split(',').filter(Boolean).length;
      }
      return value.split(',').filter(Boolean).length;
    }
    return 1;
  }

  async calculateOrderPrice(orderId: string, tx?: Prisma.TransactionClient) {
    const db = this.db(tx);
    let order = await db.order.findFirst({
      where: { id: orderId, deletedAt: null },
      include: {
        items: { include: { material: true } },
        costCalculation: true,
        priceVersions: true
      }
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    const items = order.items;
    const materialCost = roundMoney(
      items.reduce((sum, item) => {
        const base = toNumber(item.unitCost) || toNumber(item.material?.costPrice);
        return sum + toNumber(item.quantity) * base;
      }, 0)
    );

    const printingCost = roundMoney(
      items.reduce((sum, item) => {
        const area = toNumber(item.width) * toNumber(item.height);
        const complexity = item.colorMode === 'spot' ? 1.35 : item.colorMode === 'cmyk' ? 1 : 0.85;
        return sum + area * toNumber(item.quantity) * 0.01 * complexity;
      }, 0)
    );

    const prepressCost = roundMoney(items.length * 12);
    const postpressCost = roundMoney(
      items.reduce((sum, item) => sum + this.parseFinishingOptions(item.finishingOptions) * 4, 0)
    );
    const laborCost = roundMoney(items.length * 8);
    const baseCost = materialCost + printingCost + prepressCost + postpressCost + laborCost;
    const wastePercent = 5;
    const overheadCost = roundMoney(baseCost * 0.1);
    const costWithWaste = roundMoney(baseCost * (1 + wastePercent / 100));

    const markupRule = await db.markupRule.findFirst({
      where: { isActive: true, deletedAt: null },
      orderBy: { priority: 'asc' }
    });

    const profitPercent = markupRule?.markupPercent ? toNumber(markupRule.markupPercent) : 20;
    const fixedAmount = markupRule?.fixedAmount ? toNumber(markupRule.fixedAmount) : 0;
    const profitAmount = roundMoney(costWithWaste * (profitPercent / 100) + fixedAmount);
    const recommendedPrice = roundMoney(costWithWaste + overheadCost + profitAmount);
    const marginPercent = recommendedPrice > 0 ? roundMoney((profitAmount / recommendedPrice) * 100) : 0;

    const calculation = await db.costCalculation.upsert({
      where: { orderId },
      update: {
        versionNo: { increment: 1 },
        materialCost,
        printingCost,
        prepressCost,
        postpressCost,
        laborCost,
        overheadCost,
        wastePercent,
        profitPercent,
        finalRecommendedPrice: recommendedPrice
      },
      create: {
        orderId,
        versionNo: 1,
        materialCost,
        printingCost,
        prepressCost,
        postpressCost,
        laborCost,
        overheadCost,
        wastePercent,
        profitPercent,
        finalRecommendedPrice: recommendedPrice
      }
    });

    const versionNo = (order.priceVersions?.length ?? 0) + 1;
    const priceVersion = await db.priceVersion.create({
      data: {
        orderId,
        costCalculationId: calculation.id,
        versionNo,
        recommendedPrice,
        finalPrice: recommendedPrice,
        marginPercent
      }
    });

    await db.costCalculationLine.deleteMany({ where: { costCalculationId: calculation.id } });
    await db.costCalculationLine.createMany({
      data: [
        {
          costCalculationId: calculation.id,
          lineType: 'material',
          label: 'Material cost',
          unitCost: materialCost,
          totalCost: materialCost
        },
        {
          costCalculationId: calculation.id,
          lineType: 'printing',
          label: 'Printing cost',
          unitCost: printingCost,
          totalCost: printingCost
        },
        {
          costCalculationId: calculation.id,
          lineType: 'prepress',
          label: 'Prepress cost',
          unitCost: prepressCost,
          totalCost: prepressCost
        },
        {
          costCalculationId: calculation.id,
          lineType: 'postpress',
          label: 'Postpress cost',
          unitCost: postpressCost,
          totalCost: postpressCost
        },
        {
          costCalculationId: calculation.id,
          lineType: 'labor',
          label: 'Labor cost',
          unitCost: laborCost,
          totalCost: laborCost
        },
        {
          costCalculationId: calculation.id,
          lineType: 'overhead',
          label: 'Overhead cost',
          unitCost: overheadCost,
          totalCost: overheadCost
        }
      ]
    });

    const totalAmount = items.reduce((sum, item) => sum + toNumber(item.totalPrice), 0) || recommendedPrice;
    const nextStatus = OrderStatus.calculated;
    assertOrderStatusTransition(order.status, nextStatus);

    const updatedOrder = await db.order.update({
      where: { id: orderId },
      data: {
        status: nextStatus,
        totalAmount,
        costAmount: costWithWaste + overheadCost,
        profitAmount,
        marginPercent,
        customerDebtAmount: Math.max(totalAmount - toNumber(order.paidAmount), 0)
      },
      include: {
        customer: true,
        items: true,
        costCalculation: { include: { lines: true } },
        priceVersions: true
      }
    });

    await this.auditService.logTx(db as Prisma.TransactionClient, {
      action: 'order.price_calculated',
      entityType: 'order',
      entityId: orderId,
      beforeData: { status: order.status, totalAmount: toNumber(order.totalAmount) },
      afterData: updatedOrder,
      metadata: {
        calculationId: calculation.id,
        versionNo: priceVersion.versionNo
      }
    });

    return {
      order: updatedOrder,
      calculation,
      priceVersion,
      summary: {
        materialCost,
        printingCost,
        prepressCost,
        postpressCost,
        laborCost,
        overheadCost,
        wastePercent,
        profitPercent,
        profitAmount,
        recommendedPrice,
        marginPercent
      }
    };
  }

  async approvePrice(orderId: string, approvedById?: string, tx?: Prisma.TransactionClient) {
    const db = this.db(tx);
    let order = await db.order.findFirst({
      where: { id: orderId, deletedAt: null }
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.status === OrderStatus.approved) {
      return {
        order,
        approvedAt: order.approvedAt ?? new Date()
      };
    }

    if (order.status === OrderStatus.draft) {
      await this.calculateOrderPrice(orderId, tx);
      order = (await db.order.findFirst({
        where: { id: orderId, deletedAt: null }
      })) ?? order;
    }

    const calculation = await db.costCalculation.findUnique({
      where: { orderId }
    });

    if (!calculation) {
      throw new NotFoundException('Cost calculation not found');
    }

    const approver = approvedById
      ? await db.user.findFirst({
          where: { id: approvedById, deletedAt: null, isActive: true },
          select: { id: true }
        })
      : null;
    const safeApprovedById = resolveApprovedById({
      requestedUserId: approvedById,
      existingUserId: approver?.id
    });
    const approvedAt = new Date();
    const nextStatus = OrderStatus.approved;
    assertOrderStatusTransition(order.status, nextStatus);

    const beforeOrder = order;

    await db.costCalculation.update({
      where: { orderId },
      data: {
        approvedAt,
        approvedById: safeApprovedById
      }
    });

    await db.priceVersion.updateMany({
      where: { orderId, approvedAt: null },
      data: {
        approvedAt,
        approvedById: safeApprovedById
      }
    });

    const updatedOrder = await db.order.update({
      where: { id: orderId },
      data: {
        status: nextStatus,
        approvedAt
      }
    });

    await this.auditService.logTx(db as Prisma.TransactionClient, {
      action: 'order.price_approved',
      entityType: 'order',
      entityId: orderId,
      beforeData: beforeOrder,
      afterData: updatedOrder,
      metadata: {
        approvedById: safeApprovedById
      }
    });

    return { order: updatedOrder, approvedAt };
  }
}
