import type { Prisma } from '@prisma/client';
import type { PurchaseEntryQueryDto } from '../../modules/purchases/dto/purchases.dto';

function normalizeDateStart(value?: string) {
  if (!value) return undefined;

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return new Date(`${value}T00:00:00.000Z`);
  }

  return new Date(value);
}

function normalizeDateEnd(value?: string) {
  if (!value) return undefined;

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return new Date(`${value}T23:59:59.999Z`);
  }

  return new Date(value);
}

export function buildPurchaseWhere(query: Partial<PurchaseEntryQueryDto>): Prisma.PurchaseEntryWhereInput {
  return {
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
    ...(query.paymentType ? { paymentType: query.paymentType as any } : {}),
    ...(query.onlyDebtors ? { remainingDebt: { gt: 0 } } : {}),
    ...(query.dateFrom || query.dateTo
      ? {
          date: {
            gte: normalizeDateStart(query.dateFrom),
            lte: normalizeDateEnd(query.dateTo)
          }
        }
      : {})
  };
}

export function buildPurchaseOrderBy(
  sortBy?: string,
  sortOrder?: 'asc' | 'desc'
): Prisma.PurchaseEntryOrderByWithRelationInput[] {
  const field = sortBy ?? 'date';
  const direction = sortOrder ?? 'desc';

  if (field === 'createdAt') {
    return [{ createdAt: direction }];
  }

  return [{ [field]: direction }, { createdAt: 'desc' }] as Prisma.PurchaseEntryOrderByWithRelationInput[];
}
