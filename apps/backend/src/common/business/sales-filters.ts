import type { Prisma } from '@prisma/client';
import type { SalesEntryQueryDto } from '../../modules/sales/dto/sales.dto';

export function buildSalesEntryWhere(query: SalesEntryQueryDto): Prisma.SalesEntryWhereInput {
  return {
    deletedAt: null,
    ...(query.search
      ? {
          OR: [
            { productName: { contains: query.search, mode: 'insensitive' } },
            { category: { contains: query.search, mode: 'insensitive' } },
            { customer: { name: { contains: query.search, mode: 'insensitive' } } },
            { customer: { phone: { contains: query.search, mode: 'insensitive' } } },
            { manager: { fullName: { contains: query.search, mode: 'insensitive' } } },
            { qaimaNumber: { contains: query.search, mode: 'insensitive' } },
            { notes: { contains: query.search, mode: 'insensitive' } }
          ]
        }
      : {}),
    ...(query.customerId ? { customerId: query.customerId } : {}),
    ...(query.managerId ? { managerId: query.managerId } : {}),
    ...(query.paymentType ? { paymentType: query.paymentType as any } : {}),
    ...(query.deliveryStatus ? { deliveryStatus: query.deliveryStatus as any } : {}),
    ...(query.productionStage ? { productionStage: query.productionStage as any } : {}),
    ...(query.category ? { category: { contains: query.category, mode: 'insensitive' } } : {}),
    ...(query.qaimaStatus ? { qaimaStatus: query.qaimaStatus as any } : {}),
    ...(query.paymentStatus ? { paymentStatus: query.paymentStatus as any } : {}),
    ...(query.hasDebt ? { finalRemainingDebt: { gt: 0 } } : {}),
    ...(query.onlyUndelivered ? { deliveryStatus: { not: 'tehvil' as any } } : {}),
    ...(query.dateFrom || query.dateTo
      ? {
          date: {
            gte: query.dateFrom ? new Date(query.dateFrom) : undefined,
            lte: query.dateTo ? new Date(query.dateTo) : undefined
          }
        }
      : {})
  };
}
