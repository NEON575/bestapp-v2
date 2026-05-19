import {
  DebtStatus,
  InvoiceStatus,
  OrderStatus,
  PaymentStatus,
  ProductionOperationStatus,
  StockMovementType,
  StockReservationStatus
} from '@bestapp/shared';

type Tone = 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'muted';

const toneClasses: Record<Tone, string> = {
  neutral: 'bg-slate-100 text-slate-700 border-slate-200',
  success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  warning: 'bg-amber-50 text-amber-700 border-amber-200',
  danger: 'bg-rose-50 text-rose-700 border-rose-200',
  info: 'bg-sky-50 text-sky-700 border-sky-200',
  muted: 'bg-slate-50 text-slate-500 border-slate-200'
};

function normalize(value?: string | null) {
  return (value ?? '').toLowerCase();
}

function titleCase(value: string) {
  return value
    .split(/[_\s-]+/g)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

const orderStatusLabels: Record<string, string> = {
  [OrderStatus.DRAFT]: 'Черновик',
  [OrderStatus.CALCULATED]: 'Рассчитан',
  [OrderStatus.APPROVED]: 'Утвержден',
  [OrderStatus.IN_PRODUCTION]: 'В производстве',
  [OrderStatus.READY]: 'Готов',
  [OrderStatus.DELIVERED]: 'Выдан',
  [OrderStatus.CANCELLED]: 'Отменен'
};

const invoiceStatusLabels: Record<string, string> = {
  [InvoiceStatus.DRAFT]: 'Черновик',
  [InvoiceStatus.ISSUED]: 'Выставлен',
  [InvoiceStatus.PARTIALLY_PAID]: 'Частично оплачен',
  [InvoiceStatus.PAID]: 'Оплачен',
  [InvoiceStatus.OVERDUE]: 'Просрочен',
  [InvoiceStatus.CANCELLED]: 'Отменен'
};

const paymentStatusLabels: Record<string, string> = {
  [PaymentStatus.PENDING]: 'В ожидании',
  [PaymentStatus.COMPLETED]: 'Оплачен',
  [PaymentStatus.FAILED]: 'Ошибка',
  [PaymentStatus.REVERSED]: 'Возвращен'
};

const productionStatusLabels: Record<string, string> = {
  [ProductionOperationStatus.PENDING]: 'В очереди',
  [ProductionOperationStatus.READY]: 'Готов',
  [ProductionOperationStatus.IN_PROGRESS]: 'В работе',
  [ProductionOperationStatus.PAUSED]: 'Пауза',
  [ProductionOperationStatus.COMPLETED]: 'Завершен',
  [ProductionOperationStatus.FAILED]: 'Ошибка',
  [ProductionOperationStatus.CANCELLED]: 'Отменен'
};

const movementTypeLabels: Record<string, string> = {
  [StockMovementType.PURCHASE_IN]: 'Поступление',
  [StockMovementType.RESERVE]: 'Резерв',
  [StockMovementType.WRITE_OFF]: 'Списание',
  [StockMovementType.RETURN]: 'Возврат',
  [StockMovementType.ADJUSTMENT]: 'Корректировка',
  [StockMovementType.WASTE]: 'Потери'
};

const reservationStatusLabels: Record<string, string> = {
  [StockReservationStatus.OPEN]: 'Открыт',
  [StockReservationStatus.RESERVED]: 'Зарезервирован',
  [StockReservationStatus.RELEASED]: 'Освобожден',
  [StockReservationStatus.CONSUMED]: 'Списан',
  [StockReservationStatus.CANCELLED]: 'Отменен'
};

const debtStatusLabels: Record<string, string> = {
  [DebtStatus.OPEN]: 'Открыт',
  [DebtStatus.PARTIAL]: 'Частично',
  [DebtStatus.OVERDUE]: 'Просрочен',
  [DebtStatus.CLOSED]: 'Закрыт'
};

export function getToneForOrderStatus(status?: string | null): Tone {
  switch (normalize(status)) {
    case OrderStatus.APPROVED:
    case OrderStatus.READY:
    case OrderStatus.DELIVERED:
      return 'success';
    case OrderStatus.IN_PRODUCTION:
    case OrderStatus.CALCULATED:
      return 'info';
    case OrderStatus.CANCELLED:
      return 'danger';
    default:
      return 'neutral';
  }
}

export function getToneForPaymentStatus(status?: string | null): Tone {
  switch (normalize(status)) {
    case PaymentStatus.COMPLETED:
      return 'success';
    case PaymentStatus.REVERSED:
    case PaymentStatus.FAILED:
      return 'danger';
    case PaymentStatus.PENDING:
      return 'warning';
    default:
      return 'neutral';
  }
}

export function getToneForInvoiceStatus(status?: string | null): Tone {
  switch (normalize(status)) {
    case InvoiceStatus.PAID:
      return 'success';
    case InvoiceStatus.PARTIALLY_PAID:
    case InvoiceStatus.ISSUED:
      return 'info';
    case InvoiceStatus.OVERDUE:
      return 'danger';
    case InvoiceStatus.CANCELLED:
      return 'muted';
    default:
      return 'neutral';
  }
}

export function getToneForProductionStatus(status?: string | null): Tone {
  switch (normalize(status)) {
    case ProductionOperationStatus.COMPLETED:
      return 'success';
    case ProductionOperationStatus.IN_PROGRESS:
      return 'info';
    case ProductionOperationStatus.PAUSED:
      return 'warning';
    case ProductionOperationStatus.FAILED:
    case ProductionOperationStatus.CANCELLED:
      return 'danger';
    case ProductionOperationStatus.READY:
      return 'neutral';
    default:
      return 'muted';
  }
}

export function getToneForMovementType(type?: string | null): Tone {
  switch (normalize(type)) {
    case StockMovementType.PURCHASE_IN:
    case StockMovementType.RETURN:
      return 'success';
    case StockMovementType.RESERVE:
      return 'info';
    case StockMovementType.WRITE_OFF:
    case StockMovementType.WASTE:
      return 'danger';
    case StockMovementType.ADJUSTMENT:
      return 'warning';
    default:
      return 'neutral';
  }
}

export function getToneForReservationStatus(status?: string | null): Tone {
  switch (normalize(status)) {
    case StockReservationStatus.RESERVED:
      return 'info';
    case StockReservationStatus.CONSUMED:
      return 'success';
    case StockReservationStatus.RELEASED:
      return 'muted';
    case StockReservationStatus.CANCELLED:
      return 'danger';
    default:
      return 'neutral';
  }
}

export function getToneForDebtStatus(status?: string | null): Tone {
  switch (normalize(status)) {
    case DebtStatus.CLOSED:
      return 'success';
    case DebtStatus.PARTIAL:
      return 'warning';
    case DebtStatus.OVERDUE:
      return 'danger';
    default:
      return 'neutral';
  }
}

export function getStatusLabel(kind: 'order' | 'invoice' | 'payment' | 'production' | 'movement' | 'reservation' | 'debt' | 'custom', status?: string | null) {
  const normalized = normalize(status);

  if (kind === 'order') return orderStatusLabels[normalized] ?? (status ? titleCase(status) : '—');
  if (kind === 'invoice') return invoiceStatusLabels[normalized] ?? (status ? titleCase(status) : '—');
  if (kind === 'payment') return paymentStatusLabels[normalized] ?? (status ? titleCase(status) : '—');
  if (kind === 'production') return productionStatusLabels[normalized] ?? (status ? titleCase(status) : '—');
  if (kind === 'movement') return movementTypeLabels[normalized] ?? (status ? titleCase(status) : '—');
  if (kind === 'reservation') return reservationStatusLabels[normalized] ?? (status ? titleCase(status) : '—');
  if (kind === 'debt') return debtStatusLabels[normalized] ?? (status ? titleCase(status) : '—');
  return status ? titleCase(status) : '—';
}

export function toneClass(tone: Tone) {
  return toneClasses[tone];
}

