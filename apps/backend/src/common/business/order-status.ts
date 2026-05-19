import { OrderStatus } from '@prisma/client';
import { InvalidOrderStatusTransitionException } from './exceptions';

const allowedTransitions: Record<OrderStatus, OrderStatus[]> = {
  draft: [OrderStatus.calculated, OrderStatus.cancelled],
  calculated: [OrderStatus.approved, OrderStatus.cancelled],
  approved: [OrderStatus.in_production, OrderStatus.cancelled],
  in_production: [OrderStatus.ready, OrderStatus.cancelled],
  ready: [OrderStatus.delivered, OrderStatus.cancelled],
  delivered: [],
  cancelled: []
};

export function assertOrderStatusTransition(currentStatus: OrderStatus, nextStatus: OrderStatus) {
  if (currentStatus === nextStatus) {
    return;
  }

  if (!allowedTransitions[currentStatus]?.includes(nextStatus)) {
    throw new InvalidOrderStatusTransitionException(currentStatus, nextStatus);
  }
}
