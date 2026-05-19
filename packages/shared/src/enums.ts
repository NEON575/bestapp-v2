export enum UserRoleKey {
  SUPER_ADMIN = 'super_admin',
  OWNER = 'owner',
  MANAGER = 'manager',
  ACCOUNTANT = 'accountant',
  WAREHOUSE = 'warehouse',
  PRODUCTION = 'production'
}

export enum OrderStatus {
  DRAFT = 'draft',
  CONFIRMED = 'confirmed',
  IN_PRODUCTION = 'in_production',
  READY = 'ready',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled'
}

export enum StockMovementType {
  RESERVE = 'reserve',
  ISSUE = 'issue',
  RETURN = 'return',
  ADJUSTMENT = 'adjustment'
}

export enum PaymentMethod {
  CASH = 'cash',
  CARD = 'card',
  TRANSFER = 'transfer',
  MIXED = 'mixed'
}

