type NumericLike = number | string | { toString(): string } | null | undefined;

type SalesSummaryEntry = {
  saleAmount?: NumericLike;
  paymentAmount?: NumericLike;
  bonus?: NumericLike;
  customerBonus?: NumericLike;
  remainingDebt?: NumericLike;
  finalRemainingDebt?: NumericLike;
  totalCost?: NumericLike;
  profit?: NumericLike;
  profitPercent?: NumericLike;
};

function toNumber(value: NumericLike) {
  if (value == null || value === '') return 0;
  return typeof value === 'number' ? value : Number(value.toString());
}

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

export function calculateSalesGridSummary(entries: SalesSummaryEntry[]) {
  const totalSaleAmount = entries.reduce((sum, item) => sum + toNumber(item.saleAmount), 0);
  const totalPaymentAmount = entries.reduce((sum, item) => sum + toNumber(item.paymentAmount), 0);
  const totalBonus = entries.reduce((sum, item) => sum + toNumber(item.bonus), 0);
  const totalCustomerBonus = entries.reduce((sum, item) => sum + toNumber(item.customerBonus), 0);
  const totalRemainingDebt = entries.reduce((sum, item) => sum + toNumber(item.remainingDebt), 0);
  const totalFinalRemainingDebt = entries.reduce((sum, item) => sum + toNumber(item.finalRemainingDebt), 0);
  const totalCost = entries.reduce((sum, item) => sum + toNumber(item.totalCost), 0);
  const totalProfit = entries.reduce((sum, item) => sum + toNumber(item.profit), 0);
  const averageProfitPercent = entries.length
    ? entries.reduce((sum, item) => sum + toNumber(item.profitPercent), 0) / entries.length
    : 0;

  return {
    totalSaleAmount: roundMoney(totalSaleAmount),
    totalPaymentAmount: roundMoney(totalPaymentAmount),
    totalBonus: roundMoney(totalBonus),
    totalCustomerBonus: roundMoney(totalCustomerBonus),
    totalRemainingDebt: roundMoney(totalRemainingDebt),
    totalFinalRemainingDebt: roundMoney(totalFinalRemainingDebt),
    totalCost: roundMoney(totalCost),
    totalProfit: roundMoney(totalProfit),
    averageProfitPercent: roundMoney(averageProfitPercent),
    rows: entries.length
  };
}
