const OrderStatus = {
  DRAFT: 'draft',
  CALCULATED: 'calculated',
  APPROVED: 'approved',
  IN_PRODUCTION: 'in_production',
  READY: 'ready',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled'
} as const;

const CalculationStatus = {
  DRAFT: 'draft',
  APPROVED: 'approved',
  CONVERTED: 'converted'
} as const;

const InvoiceStatus = {
  DRAFT: 'draft',
  ISSUED: 'issued',
  PARTIALLY_PAID: 'partially_paid',
  PAID: 'paid',
  OVERDUE: 'overdue',
  CANCELLED: 'cancelled'
} as const;

const PaymentStatus = {
  PENDING: 'pending',
  COMPLETED: 'completed',
  FAILED: 'failed',
  REVERSED: 'reversed'
} as const;

const ProductionOperationStatus = {
  PENDING: 'pending',
  READY: 'ready',
  IN_PROGRESS: 'in_progress',
  PAUSED: 'paused',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled'
} as const;

const StockMovementType = {
  PURCHASE_IN: 'purchase_in',
  RESERVE: 'reserve',
  WRITE_OFF: 'write_off',
  RETURN: 'return',
  ADJUSTMENT: 'adjustment',
  WASTE: 'waste'
} as const;

const StockReservationStatus = {
  OPEN: 'open',
  RESERVED: 'reserved',
  RELEASED: 'released',
  CONSUMED: 'consumed',
  CANCELLED: 'cancelled'
} as const;

const DebtStatus = {
  OPEN: 'open',
  PARTIAL: 'partial',
  OVERDUE: 'overdue',
  CLOSED: 'closed'
} as const;

type Tone = 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'muted';

const toneClasses: Record<Tone, string> = {
  neutral: 'bg-slate-100/90 text-slate-700 border-slate-200/80',
  success: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20',
  warning: 'bg-amber-500/10 text-amber-700 border-amber-500/20',
  danger: 'bg-rose-500/10 text-rose-700 border-rose-500/20',
  info: 'bg-cyan-500/10 text-cyan-700 border-cyan-500/20',
  muted: 'bg-slate-50 text-slate-500 border-slate-200/80'
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

const calculationStatusLabels: Record<string, string> = {
  [CalculationStatus.DRAFT]: 'Qaralama',
  [CalculationStatus.APPROVED]: 'Təsdiqləndi',
  [CalculationStatus.CONVERTED]: 'Sifarişə çevrildi'
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

export function getToneForCalculationStatus(status?: string | null): Tone {
  switch (normalize(status)) {
    case CalculationStatus.APPROVED:
      return 'info';
    case CalculationStatus.CONVERTED:
      return 'success';
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
    case DebtStatus.OVERDUE:
      return 'danger';
    case DebtStatus.PARTIAL:
      return 'warning';
    case DebtStatus.CLOSED:
      return 'success';
    default:
      return 'neutral';
  }
}

function createLabelMap(record: Record<string, string>) {
  return (value?: string | null) => {
    const normalized = normalize(value);
    if (!normalized) {
      return '—';
    }

    return record[normalized] ?? titleCase(normalized);
  };
}

export const getOrderStatusLabel = createLabelMap(orderStatusLabels);
export const getCalculationStatusLabel = createLabelMap(calculationStatusLabels);
export const getInvoiceStatusLabel = createLabelMap(invoiceStatusLabels);
export const getPaymentStatusLabel = createLabelMap(paymentStatusLabels);
export const getProductionStatusLabel = createLabelMap(productionStatusLabels);
export const getMovementTypeLabel = createLabelMap(movementTypeLabels);
export const getReservationStatusLabel = createLabelMap(reservationStatusLabels);
export const getDebtStatusLabel = createLabelMap(debtStatusLabels);

export function getStatusLabel(
  kind: 'order' | 'calculation' | 'invoice' | 'payment' | 'production' | 'movement' | 'reservation' | 'debt' | 'custom',
  value?: string | null
) {
  switch (kind) {
    case 'order':
      return getOrderStatusLabel(value);
    case 'calculation':
      return getCalculationStatusLabel(value);
    case 'invoice':
      return getInvoiceStatusLabel(value);
    case 'payment':
      return getPaymentStatusLabel(value);
    case 'production':
      return getProductionStatusLabel(value);
    case 'movement':
      return getMovementTypeLabel(value);
    case 'reservation':
      return getReservationStatusLabel(value);
    case 'debt':
      return getDebtStatusLabel(value);
    default:
      return value ?? '—';
  }
}

export function getStatusTone(value?: string | null): Tone {
  const normalized = normalize(value);

  if (!normalized) {
    return 'neutral';
  }

  if (Object.values(OrderStatus).includes(normalized as (typeof OrderStatus)[keyof typeof OrderStatus])) {
    return getToneForOrderStatus(normalized);
  }

  if (
    Object.values(CalculationStatus).includes(normalized as (typeof CalculationStatus)[keyof typeof CalculationStatus]) ||
    Object.values(InvoiceStatus).includes(normalized as (typeof InvoiceStatus)[keyof typeof InvoiceStatus]) ||
    Object.values(PaymentStatus).includes(normalized as (typeof PaymentStatus)[keyof typeof PaymentStatus]) ||
    Object.values(ProductionOperationStatus).includes(normalized as (typeof ProductionOperationStatus)[keyof typeof ProductionOperationStatus]) ||
    Object.values(StockMovementType).includes(normalized as (typeof StockMovementType)[keyof typeof StockMovementType]) ||
    Object.values(StockReservationStatus).includes(normalized as (typeof StockReservationStatus)[keyof typeof StockReservationStatus]) ||
    Object.values(DebtStatus).includes(normalized as (typeof DebtStatus)[keyof typeof DebtStatus])
  ) {
    return 'info';
  }

  return 'neutral';
}

export function toneClass(tone: Tone) {
  return toneClasses[tone];
}
