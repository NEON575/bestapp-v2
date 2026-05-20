type NumericLike = number | string | { toString(): string } | null | undefined;

export type SalesEntryCalculationInput = {
  quantity?: NumericLike;
  saleAmount?: NumericLike;
  paymentAmount?: NumericLike;
  bonus?: NumericLike;
  customerBonus?: NumericLike;
  paperCost?: NumericLike;
  plateCost?: NumericLike;
  printCost?: NumericLike;
  specialCutCost?: NumericLike;
  knifeCost?: NumericLike;
  manualWorkCost?: NumericLike;
  spiralCost?: NumericLike;
  poniCost?: NumericLike;
  otherCost?: NumericLike;
  laminationCost?: NumericLike;
};

export type SalesEntryCalculationResult = {
  saleUnitPrice: number;
  remainingDebt: number;
  finalRemainingDebt: number;
  totalCost: number;
  profit: number;
  profitPercent: number;
};

function toNumber(value: NumericLike) {
  if (value == null || value === '') return 0;
  return typeof value === 'number' ? value : Number(value);
}

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

export function recalculateSalesEntry(input: SalesEntryCalculationInput): SalesEntryCalculationResult {
  const quantity = toNumber(input.quantity);
  const saleAmount = toNumber(input.saleAmount);
  const paymentAmount = toNumber(input.paymentAmount);
  const bonus = toNumber(input.bonus);
  const customerBonus = toNumber(input.customerBonus);

  const totalCost = roundMoney(
    toNumber(input.paperCost) +
      toNumber(input.plateCost) +
      toNumber(input.printCost) +
      toNumber(input.specialCutCost) +
      toNumber(input.knifeCost) +
      toNumber(input.manualWorkCost) +
      toNumber(input.spiralCost) +
      toNumber(input.poniCost) +
      toNumber(input.otherCost) +
      toNumber(input.laminationCost)
  );

  const saleUnitPrice = quantity > 0 ? roundMoney(saleAmount / quantity) : 0;
  const remainingDebt = roundMoney(saleAmount - paymentAmount - customerBonus);
  const finalRemainingDebt = roundMoney(saleAmount - paymentAmount - customerBonus - bonus);
  const profit = roundMoney(saleAmount - bonus - customerBonus - totalCost);
  const profitPercent = totalCost > 0 ? roundMoney((profit / totalCost) * 100) : 0;

  return {
    saleUnitPrice,
    remainingDebt,
    finalRemainingDebt,
    totalCost,
    profit,
    profitPercent
  };
}

export function aggregateCustomerDebt<
  T extends SalesEntryCalculationInput & {
    customerId: string;
    customerName: string;
    remainingDebt: NumericLike;
    finalRemainingDebt: NumericLike;
  }
>(
  entries: T[]
) {
  const grouped = new Map<
    string,
    {
      customerId: string;
      customerName: string;
      saleAmount: number;
      paymentAmount: number;
      bonus: number;
      customerBonus: number;
      remainingDebt: number;
      finalRemainingDebt: number;
    }
  >();

  for (const entry of entries) {
    const current =
      grouped.get(entry.customerId) ??
      {
        customerId: entry.customerId,
        customerName: entry.customerName,
        saleAmount: 0,
        paymentAmount: 0,
        bonus: 0,
        customerBonus: 0,
        remainingDebt: 0,
        finalRemainingDebt: 0
      };

    current.saleAmount += toNumber(entry.saleAmount);
    current.paymentAmount += toNumber(entry.paymentAmount);
    current.bonus += toNumber(entry.bonus);
    current.customerBonus += toNumber(entry.customerBonus);
    current.remainingDebt += toNumber(entry.remainingDebt);
    current.finalRemainingDebt += toNumber(entry.finalRemainingDebt);
    grouped.set(entry.customerId, current);
  }

  return Array.from(grouped.values()).map((item) => ({
    ...item,
    saleAmount: roundMoney(item.saleAmount),
    paymentAmount: roundMoney(item.paymentAmount),
    bonus: roundMoney(item.bonus),
    customerBonus: roundMoney(item.customerBonus),
    remainingDebt: roundMoney(item.remainingDebt),
    finalRemainingDebt: roundMoney(item.finalRemainingDebt)
  }));
}
