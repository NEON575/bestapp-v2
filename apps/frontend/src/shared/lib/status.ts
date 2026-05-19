import {
  InvoiceStatus,
  OrderStatus,
  PaymentStatus,
  ProductionOperationStatus,
  StockMovementType
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

export function toneClass(tone: Tone) {
  return toneClasses[tone];
}

