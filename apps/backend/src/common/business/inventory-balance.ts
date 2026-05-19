import { StockMovementType, StockReservationStatus } from '@prisma/client';

export function getMovementBalanceDelta(type: StockMovementType, quantity: number) {
  switch (type) {
    case StockMovementType.purchase_in:
    case StockMovementType.return:
      return quantity;
    case StockMovementType.write_off:
    case StockMovementType.waste:
      return -Math.abs(quantity);
    case StockMovementType.adjustment:
      return quantity;
    case StockMovementType.reserve:
      return 0;
    default:
      return quantity;
  }
}

export function isActiveReservationStatus(status: StockReservationStatus) {
  return status === StockReservationStatus.open || status === StockReservationStatus.reserved;
}
