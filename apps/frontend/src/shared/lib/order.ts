import { OrderStatus } from '@bestapp/shared';

export type OrderWorkflowAction = 'calculatePrice' | 'approve' | 'startProduction' | 'markReady' | 'deliver';

const orderStatusLabels: Record<string, string> = {
  [OrderStatus.DRAFT]: 'Черновик',
  [OrderStatus.CALCULATED]: 'Рассчитан',
  [OrderStatus.APPROVED]: 'Утвержден',
  [OrderStatus.IN_PRODUCTION]: 'В производстве',
  [OrderStatus.READY]: 'Готов',
  [OrderStatus.DELIVERED]: 'Выдан',
  [OrderStatus.CANCELLED]: 'Отменен'
};

const workflowByStatus: Record<string, OrderWorkflowAction | null> = {
  [OrderStatus.DRAFT]: 'calculatePrice',
  [OrderStatus.CALCULATED]: 'approve',
  [OrderStatus.APPROVED]: 'startProduction',
  [OrderStatus.IN_PRODUCTION]: 'markReady',
  [OrderStatus.READY]: 'deliver',
  [OrderStatus.DELIVERED]: null,
  [OrderStatus.CANCELLED]: null
};

const workflowLabels: Record<OrderWorkflowAction, string> = {
  calculatePrice: 'Рассчитать цену',
  approve: 'Утвердить',
  startProduction: 'Запустить производство',
  markReady: 'Пометить готовым',
  deliver: 'Выдать'
};

export function getOrderStatusLabel(status?: string | null) {
  const normalized = (status ?? '').toLowerCase();
  return orderStatusLabels[normalized] ?? '—';
}

export function getNextOrderWorkflowAction(status?: string | null) {
  const normalized = (status ?? '').toLowerCase();
  return workflowByStatus[normalized] ?? null;
}

export function getOrderWorkflowActionLabel(action: OrderWorkflowAction) {
  return workflowLabels[action];
}

export function isOrderCancelable(status?: string | null) {
  const normalized = (status ?? '').toLowerCase();
  return normalized !== OrderStatus.DELIVERED && normalized !== OrderStatus.CANCELLED;
}

