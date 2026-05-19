export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

export interface PaginationQuery {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  dateFrom?: string;
  dateTo?: string;
}

export interface SelectOption {
  label: string;
  value: string;
}

export interface AuthSession {
  accessToken: string;
  user: AuthUser;
}

export interface AuthUser {
  sub: string;
  email: string;
  fullName: string;
  roles: string[];
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface CustomerSummary {
  id: string;
  name: string;
  companyName?: string | null;
  totalAmount?: number;
}

export interface OrderItemDetail {
  id: string;
  name: string;
  productType: string;
  width: number;
  height: number;
  quantity: number;
  colorMode: string;
  materialId?: string | null;
  unitCost: number;
  totalCost: number;
  unitPrice: number;
  totalPrice: number;
  comment?: string | null;
}

export interface OrderDetail {
  id: string;
  number: string;
  status: string;
  totalAmount: number;
  costAmount: number;
  profitAmount: number;
  marginPercent: number;
  customerDebtAmount: number;
  customer: Record<string, unknown>;
  manager?: Record<string, unknown> | null;
  items: OrderItemDetail[];
  costCalculation?: Record<string, unknown> | null;
  priceVersions: Record<string, unknown>[];
  productionRoutes: Record<string, unknown>[];
  productionJobs: Record<string, unknown>[];
  stockReservations: Record<string, unknown>[];
  stockMovements: Record<string, unknown>[];
  invoices: Record<string, unknown>[];
  payments: Record<string, unknown>[];
  receivable?: Record<string, unknown> | null;
  profitability: {
    netProfit: number;
    marginPercent: number;
    customerDebtAmount: number;
    isProfitable: boolean;
  };
  auditLogs: Record<string, unknown>[];
}

export interface DashboardSummary {
  totalOrders: number;
  ordersInProduction: number;
  readyOrders: number;
  overdueOrders: number;
  totalRevenue: number;
  totalPaid: number;
  totalDebt: number;
  cashboxBalance: number;
  lowStockMaterials: number;
  todayPayments: number;
  monthRevenue: number;
  monthProfit: number;
  topCustomers: CustomerSummary[];
  recentOrders: Record<string, unknown>[];
  recentPayments: Record<string, unknown>[];
}

export interface InventorySummary {
  totalMaterials: number;
  lowStockCount: number;
  totalStockValue: number;
  reservedValue: number;
  materialsBelowMinimum: Record<string, unknown>[];
  recentMovements: Record<string, unknown>[];
}

export interface FinanceSummary {
  totalInvoices: number;
  unpaidInvoices: number;
  overdueInvoices: number;
  totalReceivables: number;
  totalPayables: number;
  totalCashboxBalance: number;
  todayIncome: number;
  todayExpense: number;
  monthIncome: number;
  monthExpense: number;
}

export interface ProductionBoard {
  pending: Record<string, unknown>[];
  ready: Record<string, unknown>[];
  in_progress: Record<string, unknown>[];
  paused: Record<string, unknown>[];
  completed: Record<string, unknown>[];
  failed: Record<string, unknown>[];
}
