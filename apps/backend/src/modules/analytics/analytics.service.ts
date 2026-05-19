import { Injectable } from '@nestjs/common';
import { InvoiceStatus, OrderStatus, PaymentStatus, Prisma } from '@prisma/client';
import { calculateDashboardSummary } from '../../common/business/dashboard-summary';
import { PrismaService } from '../../common/prisma/prisma.service';

function toNumber(value: Prisma.Decimal | number | string | null | undefined) {
  if (value == null) return 0;
  return typeof value === 'number' ? value : Number(value.toString());
}

function startOfDay(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function startOfMonth(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async dashboard() {
    const now = new Date();
    const dayStart = startOfDay(now);
    const monthStart = startOfMonth(now);

    const [
      totalOrders,
      ordersInProduction,
      readyOrders,
      overdueOrders,
      invoices,
      receivables,
      cashboxes,
      todayPayments,
      monthInvoices,
      monthOrders,
      materials,
      recentOrders,
      recentPayments
    ] = await this.prisma.$transaction([
      this.prisma.order.count({ where: { deletedAt: null } }),
      this.prisma.order.count({ where: { deletedAt: null, status: OrderStatus.in_production } }),
      this.prisma.order.count({ where: { deletedAt: null, status: OrderStatus.ready } }),
      this.prisma.order.count({
        where: {
          deletedAt: null,
          status: { notIn: [OrderStatus.delivered, OrderStatus.cancelled] },
          deadlineAt: { lt: now }
        }
      }),
      this.prisma.invoice.aggregate({
        where: { deletedAt: null, status: { not: InvoiceStatus.cancelled } },
        _sum: { totalAmount: true, paidAmount: true }
      }),
      this.prisma.receivable.aggregate({
        where: { deletedAt: null },
        _sum: { amount: true, paidAmount: true }
      }),
      this.prisma.cashbox.aggregate({
        where: { deletedAt: null },
        _sum: { currentBalance: true }
      }),
      this.prisma.payment.aggregate({
        where: {
          deletedAt: null,
          status: PaymentStatus.completed,
          createdAt: { gte: dayStart }
        },
        _sum: { amount: true }
      }),
      this.prisma.invoice.aggregate({
        where: {
          deletedAt: null,
          createdAt: { gte: monthStart },
          status: { not: InvoiceStatus.cancelled }
        },
        _sum: { totalAmount: true, paidAmount: true }
      }),
      this.prisma.order.aggregate({
        where: {
          deletedAt: null,
          createdAt: { gte: monthStart }
        },
        _sum: { profitAmount: true, totalAmount: true }
      }),
      this.prisma.material.findMany({
        where: { deletedAt: null },
        include: { stockLevels: true }
      }),
      this.prisma.order.findMany({
        where: { deletedAt: null },
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: { customer: true, manager: true }
      }),
      this.prisma.payment.findMany({
        where: { deletedAt: null },
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: { order: true, invoice: true, cashbox: true }
      })
    ]);

    const orderRows = await this.prisma.order.findMany({
      where: { deletedAt: null },
      include: { customer: true }
    });

    const customerTotals = new Map<
      string,
      { id: string; name: string; companyName?: string | null; totalAmount: number }
    >();

    for (const order of orderRows) {
      const current = customerTotals.get(order.customerId) ?? {
        id: order.customerId,
        name: order.customer.name,
        companyName: order.customer.companyName,
        totalAmount: 0
      };

      current.totalAmount += toNumber(order.totalAmount);
      customerTotals.set(order.customerId, current);
    }

    const normalizedMaterials = materials.map((material) => {
      const stockLevels = material.stockLevels ?? [];
      const available = stockLevels.reduce((sum, level) => sum + toNumber(level.available), 0);
      const minStockLevel = toNumber(material.minStockLevel);

      return {
        id: material.id,
        name: material.name,
        sku: material.sku,
        unit: material.unit,
        available,
        minStockLevel
      };
    });

    const lowStockMaterials = normalizedMaterials.filter((material) => material.available <= material.minStockLevel).length;
    const totalRevenue = toNumber(invoices._sum.totalAmount);
    const totalPaid = toNumber(invoices._sum.paidAmount);
    const totalDebt = Math.max(toNumber(receivables._sum.amount) - toNumber(receivables._sum.paidAmount), 0);
    const monthRevenue = toNumber(monthInvoices._sum.totalAmount);
    const monthProfit = toNumber(monthOrders._sum.profitAmount);

    return calculateDashboardSummary({
      totalOrders,
      ordersInProduction,
      readyOrders,
      overdueOrders,
      totalRevenue,
      totalPaid,
      totalDebt,
      cashboxBalance: toNumber(cashboxes._sum.currentBalance),
      lowStockMaterials,
      todayPayments: toNumber(todayPayments._sum.amount),
      monthRevenue,
      monthProfit,
      topCustomers: Array.from(customerTotals.values())
        .sort((a, b) => b.totalAmount - a.totalAmount)
        .slice(0, 5),
      recentOrders,
      recentPayments
    });
  }
}
