function round(value: number, precision = 4) {
  const factor = 10 ** precision;
  return Math.round(value * factor) / factor;
}

export function calculatePackageQuantity(packageQuantity?: number | null, unitsPerPackage?: number | null, fallbackQuantity?: number | null) {
  const packages = Number(packageQuantity ?? 0);
  const units = Number(unitsPerPackage ?? 0);
  if (packages > 0 && units > 0) {
    return round(packages * units);
  }

  return round(Number(fallbackQuantity ?? 0));
}

export function recalculatePurchaseFlow(input: {
  quantity?: number | null;
  packageQuantity?: number | null;
  unitsPerPackage?: number | null;
  unitPrice?: number | null;
  totalAmount?: number | null;
  paymentAmount?: number | null;
}) {
  const totalQuantity = calculatePackageQuantity(input.packageQuantity, input.unitsPerPackage, input.quantity);
  const paymentAmount = round(Number(input.paymentAmount ?? 0), 2);
  const explicitTotal = Number(input.totalAmount ?? 0);
  const explicitUnit = Number(input.unitPrice ?? 0);

  let unitPrice = explicitUnit > 0 ? explicitUnit : 0;
  let totalAmount = explicitTotal > 0 ? explicitTotal : 0;

  if (totalQuantity > 0 && unitPrice > 0) {
    totalAmount = round(totalQuantity * unitPrice, 2);
  } else if (totalQuantity > 0 && totalAmount > 0) {
    unitPrice = round(totalAmount / totalQuantity, 4);
  }

  const remainingDebt = round(totalAmount - paymentAmount, 2);

  return {
    totalQuantity,
    unitPrice: round(unitPrice, 4),
    totalAmount: round(totalAmount, 2),
    paymentAmount,
    remainingDebt
  };
}

export function calculateNextAverageCost(input: {
  currentOnHand: number;
  currentAverageCost: number;
  incomingQuantity: number;
  incomingUnitPrice: number;
}) {
  const currentValue = Number(input.currentOnHand) * Number(input.currentAverageCost);
  const incomingValue = Number(input.incomingQuantity) * Number(input.incomingUnitPrice);
  const totalQuantity = Number(input.currentOnHand) + Number(input.incomingQuantity);

  if (totalQuantity <= 0) {
    return 0;
  }

  return round((currentValue + incomingValue) / totalQuantity, 4);
}

export function calculateStockValue(onHand: number, averageCost: number) {
  return round(Number(onHand) * Number(averageCost), 2);
}

export function buildPurchaseMovement(input: {
  materialId: string;
  warehouseId?: string | null;
  totalQuantity: number;
  unitPrice: number;
  totalAmount: number;
  reference?: string | null;
  note?: string | null;
}) {
  return {
    type: 'purchase_in' as const,
    materialId: input.materialId,
    warehouseId: input.warehouseId ?? null,
    quantity: round(Number(input.totalQuantity), 4),
    balanceDelta: round(Number(input.totalQuantity), 4),
    unitCost: round(Number(input.unitPrice), 4),
    totalCost: round(Number(input.totalAmount), 2),
    reference: input.reference ?? null,
    note: input.note ?? null
  };
}

export function applyPurchaseReceipt(input: {
  currentOnHand: number;
  currentAverageCost: number;
  incomingQuantity: number;
  incomingUnitPrice: number;
  paymentAmount?: number | null;
}) {
  const currentOnHand = Number(input.currentOnHand ?? 0);
  const incomingQuantity = Number(input.incomingQuantity ?? 0);
  const incomingUnitPrice = Number(input.incomingUnitPrice ?? 0);
  const nextOnHand = round(currentOnHand + incomingQuantity, 4);
  const nextAverageCost = calculateNextAverageCost({
    currentOnHand,
    currentAverageCost: Number(input.currentAverageCost ?? 0),
    incomingQuantity,
    incomingUnitPrice
  });
  const totalAmount = round(incomingQuantity * incomingUnitPrice, 2);
  const paymentAmount = round(Number(input.paymentAmount ?? 0), 2);
  const remainingDebt = round(totalAmount - paymentAmount, 2);

  return {
    onHand: nextOnHand,
    lastPurchasePrice: round(incomingUnitPrice, 4),
    averageCost: nextAverageCost,
    totalAmount,
    paymentAmount,
    remainingDebt,
    stockValue: calculateStockValue(nextOnHand, nextAverageCost)
  };
}
