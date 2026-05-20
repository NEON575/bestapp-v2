export enum UserRoleKey {
  SUPER_ADMIN = 'super_admin',
  OWNER = 'owner',
  MANAGER = 'manager',
  ACCOUNTANT = 'accountant',
  WAREHOUSE = 'warehouse',
  PRODUCTION = 'production',
  CASHIER = 'cashier'
}

export enum OrderStatus {
  DRAFT = 'draft',
  CALCULATED = 'calculated',
  APPROVED = 'approved',
  IN_PRODUCTION = 'in_production',
  READY = 'ready',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled'
}

export enum OrderItemColorMode {
  CMYK = 'cmyk',
  RGB = 'rgb',
  SPOT = 'spot',
  GRAYSCALE = 'grayscale'
}

export enum StockMovementType {
  PURCHASE_IN = 'purchase_in',
  RESERVE = 'reserve',
  WRITE_OFF = 'write_off',
  RETURN = 'return',
  ADJUSTMENT = 'adjustment',
  WASTE = 'waste'
}

export enum StockReservationStatus {
  OPEN = 'open',
  RESERVED = 'reserved',
  RELEASED = 'released',
  CONSUMED = 'consumed',
  CANCELLED = 'cancelled'
}

export enum ProductionOperationStatus {
  PENDING = 'pending',
  READY = 'ready',
  IN_PROGRESS = 'in_progress',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

export enum ProductionJobStatus {
  QUEUED = 'queued',
  IN_PROGRESS = 'in_progress',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

export enum PaymentMethod {
  CASH = 'cash',
  CARD = 'card',
  BANK_TRANSFER = 'bank_transfer',
  OTHER = 'other'
}

export enum PaymentStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  FAILED = 'failed',
  REVERSED = 'reversed'
}

export enum InvoiceStatus {
  DRAFT = 'draft',
  ISSUED = 'issued',
  PARTIALLY_PAID = 'partially_paid',
  PAID = 'paid',
  OVERDUE = 'overdue',
  CANCELLED = 'cancelled'
}

export enum CashboxTransactionType {
  INCOME = 'income',
  EXPENSE = 'expense',
  TRANSFER = 'transfer'
}

export enum DebtStatus {
  OPEN = 'open',
  PARTIAL = 'partial',
  OVERDUE = 'overdue',
  CLOSED = 'closed'
}

export enum CostLineType {
  MATERIAL = 'material',
  PRINTING = 'printing',
  PREPRESS = 'prepress',
  POSTPRESS = 'postpress',
  LABOR = 'labor',
  OVERHEAD = 'overhead',
  WASTE = 'waste'
}

export enum SalesPaymentType {
  HESAB = 'hesab',
  KART = 'kart',
  NEGD = 'negd',
  KASSA = 'kassa'
}

export enum SalesDeliveryStatus {
  SIFARIS = 'sifaris',
  HAZIR = 'hazir',
  TEHVIL = 'tehvil',
  LEGV = 'legv'
}

export enum SalesProductionStage {
  DIZAYN = 'dizayn',
  FORMA = 'forma',
  CAP = 'cap',
  LAMINASIYA = 'laminasiya',
  KESIM = 'kesim',
  EL_ISI = 'el_isi',
  BITIB = 'bitib',
  ODENIS = 'odenis',
  PONI = 'poni',
  OZEL_KESIM = 'ozel_kesim'
}

export enum QaimaStatus {
  YAZILIB = 'yazilib',
  YAZILMAYIB = 'yazilmayib',
  NEGD = 'negd'
}

export enum SalesPaymentStatus {
  ODENILIB = 'odenilib',
  YAZILIB = 'yazilib'
}

export enum PrintColorOption {
  FOUR_ZERO = 'four_zero',
  FOUR_FOUR = 'four_four',
  FOUR_ONE = 'four_one'
}

export enum PrintTypeOption {
  SVOY = 'svoy',
  CUJOY = 'cujoy',
  BIR_UZLU = 'bir_uzlu'
}
