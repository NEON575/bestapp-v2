import type { CreateOrderItemDto } from '../../modules/orders/dto/order.dto';

function toNumber(value: number | string | null | undefined, fallback = 0) {
  if (value == null || value === '') {
    return fallback;
  }

  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function normalizeCreateOrderItem(item: CreateOrderItemDto) {
  const quantity = toNumber(item.quantity, 0);
  const unitPrice = toNumber(item.unitPrice, 0);
  const totalPrice = toNumber(item.totalPrice, quantity * unitPrice);
  const unitCost = toNumber(item.unitCost, 0);
  const totalCost = toNumber(item.totalCost, quantity * unitCost);

  return {
    name: item.name,
    productType: item.productType?.trim() || 'print_job',
    formatText: item.formatText?.trim() || null,
    printColorText: item.printColorText?.trim() || null,
    width: toNumber(item.width, 0),
    height: toNumber(item.height, 0),
    quantity,
    colorMode: item.colorMode ?? 'cmyk',
    materialId: item.materialId || null,
    finishingOptions: item.finishingOptions || null,
    unitCost,
    totalCost,
    unitPrice,
    totalPrice,
    comment: item.comment?.trim() || null
  };
}
