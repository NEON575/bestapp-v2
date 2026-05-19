import { OrderStatus, Prisma } from '@prisma/client';
import { OrderListQueryDto } from '../../modules/orders/dto/order-query.dto';

export function buildOrderListWhere(query: OrderListQueryDto, now = new Date()): Prisma.OrderWhereInput {
  const where: Prisma.OrderWhereInput = {
    deletedAt: null
  };

  const and: Prisma.OrderWhereInput[] = [];

  if (query.search) {
    and.push({
      OR: [
        { number: { contains: query.search, mode: 'insensitive' } },
        { comment: { contains: query.search, mode: 'insensitive' } },
        { customer: { name: { contains: query.search, mode: 'insensitive' } } },
        { customer: { companyName: { contains: query.search, mode: 'insensitive' } } }
      ]
    });
  }

  if (query.status) {
    and.push({ status: query.status as OrderStatus });
  }

  if (query.customerId) {
    and.push({ customerId: query.customerId });
  }

  if (query.managerId) {
    and.push({ managerId: query.managerId });
  }

  if (query.dateFrom || query.dateTo) {
    and.push({
      createdAt: {
        gte: query.dateFrom ? new Date(query.dateFrom) : undefined,
        lte: query.dateTo ? new Date(query.dateTo) : undefined
      }
    });
  }

  if (query.deadlineFrom || query.deadlineTo) {
    and.push({
      deadlineAt: {
        gte: query.deadlineFrom ? new Date(query.deadlineFrom) : undefined,
        lte: query.deadlineTo ? new Date(query.deadlineTo) : undefined
      }
    });
  }

  if (query.hasDebt) {
    and.push({ customerDebtAmount: { gt: 0 } });
  }

  if (query.inProduction) {
    and.push({ status: OrderStatus.in_production });
  }

  if (query.overdue) {
    and.push({
      status: { notIn: [OrderStatus.delivered, OrderStatus.cancelled] },
      deadlineAt: { lt: now }
    });
  }

  if (and.length) {
    where.AND = and;
  }

  return where;
}
