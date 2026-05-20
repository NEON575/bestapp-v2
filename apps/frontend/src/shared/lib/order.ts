import { OrderStatus } from '@bestapp/shared';

export type OrderWorkflowAction = 'calculatePrice' | 'approve' | 'startProduction' | 'markReady' | 'deliver';

const orderStatusLabels: Record<string, string> = {
  [OrderStatus.DRAFT]: 'Qaralama',
  [OrderStatus.CALCULATED]: 'Hesablanıb',
  [OrderStatus.APPROVED]: 'Təsdiqlənib',
  [OrderStatus.IN_PRODUCTION]: 'İstehsalda',
  [OrderStatus.READY]: 'Hazır',
  [OrderStatus.DELIVERED]: 'Təhvil verilib',
  [OrderStatus.CANCELLED]: 'Ləğv edilib'
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
  calculatePrice: 'Qiyməti hesabla',
  approve: 'Təsdiqlə',
  startProduction: 'İstehsala göndər',
  markReady: 'Hazır et',
  deliver: 'Təhvil ver'
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
