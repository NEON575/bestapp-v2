type NumericLike = number | string | { toString(): string } | null | undefined;

function toNumber(value: NumericLike) {
  if (value == null || value === '') return 0;
  return typeof value === 'number' ? value : Number(value);
}

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

export function recalculateSalaryEntry(salaryAmount: NumericLike, bonusAmount: NumericLike, paymentAmount: NumericLike) {
  const salary = toNumber(salaryAmount);
  const bonus = toNumber(bonusAmount);
  const paid = toNumber(paymentAmount);
  const totalAccrued = salary + bonus;

  return {
    salaryAmount: roundMoney(salary),
    bonusAmount: roundMoney(bonus),
    paymentAmount: roundMoney(paid),
    remainingDebt: roundMoney(totalAccrued - paid)
  };
}

export function aggregateSalaryByEmployee<T extends { employeeId: string; employeeName: string; salaryAmount: NumericLike; bonusAmount: NumericLike; paymentAmount: NumericLike; remainingDebt: NumericLike }>(
  entries: T[]
) {
  const grouped = new Map<
    string,
    {
      employeeId: string;
      employeeName: string;
      salaryAmount: number;
      bonusAmount: number;
      paymentAmount: number;
      remainingDebt: number;
    }
  >();

  for (const entry of entries) {
    const current =
      grouped.get(entry.employeeId) ??
      {
        employeeId: entry.employeeId,
        employeeName: entry.employeeName,
        salaryAmount: 0,
        bonusAmount: 0,
        paymentAmount: 0,
        remainingDebt: 0
      };

    current.salaryAmount += toNumber(entry.salaryAmount);
    current.bonusAmount += toNumber(entry.bonusAmount);
    current.paymentAmount += toNumber(entry.paymentAmount);
    current.remainingDebt += toNumber(entry.remainingDebt);
    grouped.set(entry.employeeId, current);
  }

  return Array.from(grouped.values()).map((item) => ({
    ...item,
    salaryAmount: roundMoney(item.salaryAmount),
    bonusAmount: roundMoney(item.bonusAmount),
    paymentAmount: roundMoney(item.paymentAmount),
    remainingDebt: roundMoney(item.remainingDebt)
  }));
}
