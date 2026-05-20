type NumericLike = number | string | { toString(): string } | null | undefined;

function toNumber(value: NumericLike) {
  if (value == null || value === '') return 0;
  return typeof value === 'number' ? value : Number(value);
}

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

export function recalculatePurchaseEntry(amount: NumericLike, paymentAmount: NumericLike) {
  const totalAmount = toNumber(amount);
  const paid = toNumber(paymentAmount);

  return {
    amount: roundMoney(totalAmount),
    paymentAmount: roundMoney(paid),
    remainingDebt: roundMoney(totalAmount - paid)
  };
}

export function aggregateSupplierDebt<T extends { supplierId: string; supplierName: string; amount: NumericLike; paymentAmount: NumericLike; remainingDebt: NumericLike }>(
  entries: T[]
) {
  const grouped = new Map<
    string,
    {
      supplierId: string;
      supplierName: string;
      purchaseAmount: number;
      paymentAmount: number;
      remainingDebt: number;
    }
  >();

  for (const entry of entries) {
    const current =
      grouped.get(entry.supplierId) ??
      {
        supplierId: entry.supplierId,
        supplierName: entry.supplierName,
        purchaseAmount: 0,
        paymentAmount: 0,
        remainingDebt: 0
      };

    current.purchaseAmount += toNumber(entry.amount);
    current.paymentAmount += toNumber(entry.paymentAmount);
    current.remainingDebt += toNumber(entry.remainingDebt);
    grouped.set(entry.supplierId, current);
  }

  return Array.from(grouped.values()).map((item) => ({
    ...item,
    purchaseAmount: roundMoney(item.purchaseAmount),
    paymentAmount: roundMoney(item.paymentAmount),
    remainingDebt: roundMoney(item.remainingDebt)
  }));
}
