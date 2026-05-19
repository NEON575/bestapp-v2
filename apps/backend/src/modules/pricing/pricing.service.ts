import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, OrderStatus } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';

function toNumber(value: Prisma.Decimal | number | string | null | undefined) {
  if (value == null) return 0;
  return typeof value === 'number' ? value : Number(value.toString());
}

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

@Injectable()
export class PricingService {
  constructor(private readonly prisma: PrismaService) {}

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

  async calculateOrderPrice(orderId: string) {
    const order = await this.prisma.order.findFirst({
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

    const markupRule = await this.prisma.markupRule.findFirst({
      where: { isActive: true, deletedAt: null },
      orderBy: { priority: 'asc' }
    });

    const profitPercent = markupRule?.markupPercent ? toNumber(markupRule.markupPercent) : 20;
    const fixedAmount = markupRule?.fixedAmount ? toNumber(markupRule.fixedAmount) : 0;
    const profitAmount = roundMoney(costWithWaste * (profitPercent / 100) + fixedAmount);
    const recommendedPrice = roundMoney(costWithWaste + overheadCost + profitAmount);
    const marginPercent = recommendedPrice > 0 ? roundMoney((profitAmount / recommendedPrice) * 100) : 0;

    const calculation = await this.prisma.costCalculation.upsert({
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
    const priceVersion = await this.prisma.priceVersion.create({
      data: {
        orderId,
        costCalculationId: calculation.id,
        versionNo,
        recommendedPrice,
        finalPrice: recommendedPrice,
        marginPercent
      }
    });

    await this.prisma.costCalculationLine.deleteMany({ where: { costCalculationId: calculation.id } });
    await this.prisma.costCalculationLine.createMany({
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

    const updatedOrder = await this.prisma.order.update({
      where: { id: orderId },
      data: {
        status: OrderStatus.calculated,
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

  async approvePrice(orderId: string, approvedById?: string) {
    const calculation = await this.prisma.costCalculation.findUnique({
      where: { orderId }
    });

    if (!calculation) {
      return this.calculateOrderPrice(orderId);
    }

    const approvedAt = new Date();
    await this.prisma.costCalculation.update({
      where: { orderId },
      data: {
        approvedAt,
        approvedById
      }
    });

    await this.prisma.priceVersion.updateMany({
      where: { orderId, approvedAt: null },
      data: {
        approvedAt,
        approvedById
      }
    });

    const order = await this.prisma.order.update({
      where: { id: orderId },
      data: {
        status: OrderStatus.approved,
        approvedAt
      }
    });

    return { order, approvedAt };
  }
}

