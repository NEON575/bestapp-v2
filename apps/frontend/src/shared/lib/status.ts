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
  [OrderStatus.DRAFT]: 'Qaralama',
  [OrderStatus.CALCULATED]: 'Hesablanıb',
  [OrderStatus.APPROVED]: 'Təsdiqlənib',
  [OrderStatus.IN_PRODUCTION]: 'İstehsalda',
  [OrderStatus.READY]: 'Hazır',
  [OrderStatus.DELIVERED]: 'Təhvil verilib',
  [OrderStatus.CANCELLED]: 'Ləğv edilib'
};

const invoiceStatusLabels: Record<string, string> = {
  [InvoiceStatus.DRAFT]: 'Qaralama',
  [InvoiceStatus.ISSUED]: 'Yazılıb',
  [InvoiceStatus.PARTIALLY_PAID]: 'Qismən ödənilib',
  [InvoiceStatus.PAID]: 'Ödənilib',
  [InvoiceStatus.OVERDUE]: 'Gecikib',
  [InvoiceStatus.CANCELLED]: 'Ləğv edilib'
};

const paymentStatusLabels: Record<string, string> = {
  [PaymentStatus.PENDING]: 'Gözləyir',
  [PaymentStatus.COMPLETED]: 'Ödənilib',
  [PaymentStatus.FAILED]: 'Xəta',
  [PaymentStatus.REVERSED]: 'Geri qaytarılıb'
};

const productionStatusLabels: Record<string, string> = {
  [ProductionOperationStatus.PENDING]: 'Növbədə',
  [ProductionOperationStatus.READY]: 'Hazır',
  [ProductionOperationStatus.IN_PROGRESS]: 'İşdə',
  [ProductionOperationStatus.PAUSED]: 'Dayandırılıb',
  [ProductionOperationStatus.COMPLETED]: 'Bitib',
  [ProductionOperationStatus.FAILED]: 'Xəta',
  [ProductionOperationStatus.CANCELLED]: 'Ləğv edilib'
};

const movementTypeLabels: Record<string, string> = {
  [StockMovementType.PURCHASE_IN]: 'Mədaxil',
  [StockMovementType.RESERVE]: 'Rezerv',
  [StockMovementType.WRITE_OFF]: 'Silinmə',
  [StockMovementType.RETURN]: 'Qaytarma',
  [StockMovementType.ADJUSTMENT]: 'Düzəliş',
  [StockMovementType.WASTE]: 'Tullantı'
};

const reservationStatusLabels: Record<string, string> = {
  [StockReservationStatus.OPEN]: 'Açıq',
  [StockReservationStatus.RESERVED]: 'Rezerv edilib',
  [StockReservationStatus.RELEASED]: 'Azad edilib',
  [StockReservationStatus.CONSUMED]: 'İstifadə edilib',
  [StockReservationStatus.CANCELLED]: 'Ləğv edilib'
};

const debtStatusLabels: Record<string, string> = {
  [DebtStatus.OPEN]: 'Açıq',
  [DebtStatus.PARTIAL]: 'Qismən',
  [DebtStatus.OVERDUE]: 'Gecikib',
  [DebtStatus.CLOSED]: 'Bağlanıb'
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
