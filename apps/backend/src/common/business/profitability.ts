export function calculateOrderProfitability(input: {
  totalAmount: number;
  costAmount: number;
  paidAmount: number;
}) {
  const profitAmount = Math.round((input.totalAmount - input.costAmount) * 100) / 100;
  const marginPercent = input.totalAmount > 0 ? Math.round((profitAmount / input.totalAmount) * 10000) / 100 : 0;

  return {
    netProfit: profitAmount,
    marginPercent,
    customerDebtAmount: Math.max(input.totalAmount - input.paidAmount, 0),
    isProfitable: input.totalAmount >= input.costAmount
  };
}
