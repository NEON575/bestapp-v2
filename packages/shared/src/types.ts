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

export interface UserSummary {
  id: string;
  email: string;
  fullName: string;
  phone?: string | null;
  isActive?: boolean;
  roles?: string[];
}

export interface CustomerListItem {
  id: string;
  name: string;
  companyName?: string | null;
  phone?: string | null;
  email?: string | null;
  taxId?: string | null;
  address?: string | null;
  notes?: string | null;
  inquiryNote?: string | null;
  isActive?: boolean;
  totalOrders?: number;
  totalAmount?: number;
  createdAt?: string;
}

export interface OrderListItem {
  id: string;
  number: string;
  status: string;
  totalAmount: number;
  paidAmount: number;
  customerDebtAmount: number;
  deadlineAt?: string | null;
  createdAt: string;
  updatedAt?: string;
  customer?: CustomerSummary | null;
  manager?: UserSummary | null;
}

export interface SupplierItem {
  id: string;
  code?: string | null;
  name: string;
  phone?: string | null;
  taxId?: string | null;
  email?: string | null;
  address?: string | null;
  notes?: string | null;
  isActive: boolean;
}

export interface EmployeeItem {
  id: string;
  userId?: string | null;
  fullName: string;
  phone?: string | null;
  title?: string | null;
  roleKey?: string | null;
  notes?: string | null;
  isActive: boolean;
}

export interface PaperItem {
  id: string;
  code: string;
  name: string;
  gram: number;
  size: string;
  packPrice: number;
  sheetsInPack: number;
  pricePerSheet: number;
  vatIncluded: boolean;
  unit: string;
  notes?: string | null;
  supplier?: SupplierItem | null;
}

export interface ExcelImportPreviewSheet {
  name: string;
  found?: boolean;
  rows: number;
  columns: string[];
  mappingErrors: string[];
  confidence?: number;
  sampleRows?: Array<Record<string, unknown>>;
}

export interface ExcelImportPreviewResult {
  fileName: string;
  sheets: ExcelImportPreviewSheet[];
  requiredSheets?: Array<{
    name: string;
    found: boolean;
    confidence: number;
  }>;
  workbookError?: string | null;
}

export interface SalesEntryItem {
  id: string;
  orderId?: string | null;
  date: string;
  customerId: string;
  managerId?: string | null;
  category?: string | null;
  productName: string;
  quantity: number;
  saleUnitPrice: number;
  saleAmount: number;
  paymentAmount: number;
  paymentType: string;
  bonus: number;
  customerBonus: number;
  remainingDebt: number;
  finalRemainingDebt: number;
  productionStage?: string | null;
  deliveryStatus: string;
  deliveryDate?: string | null;
  paymentStatus?: string | null;
  qaimaStatus?: string | null;
  qaimaDate?: string | null;
  qaimaNumber?: string | null;
  printColor?: string | null;
  printType?: string | null;
  paperCost: number;
  plateCost: number;
  printCost: number;
  specialCutCost: number;
  knifeCost: number;
  manualWorkCost: number;
  spiralCost: number;
  poniCost: number;
  otherCost: number;
  laminationCost: number;
  totalCost: number;
  profit: number;
  profitPercent: number;
  spiralType?: string | null;
  spiralQuantity?: number | null;
  spiralUnitCost?: number | null;
  spiralTotalCost?: number | null;
  invoiceStatusText?: string | null;
  notes?: string | null;
  customer?: CustomerSummary | null;
  manager?: UserSummary | null;
  order?: OrderListItem | null;
  paper?: PaperItem | null;
}

export interface PurchaseEntryItem {
  id: string;
  date: string;
  quantity?: number;
  stockUnit?: string | null;
  packageUnit?: string | null;
  unitsPerPackage?: number | null;
  packageQuantity?: number | null;
  totalQuantity?: number;
  unitPrice?: number;
  amount: number;
  paymentAmount: number;
  remainingDebt: number;
  paymentType: string;
  comment?: string | null;
  material?: InventoryMaterialItem | null;
  warehouse?: WarehouseItem | null;
  supplier?: SupplierItem | null;
}

export interface SalaryEntryItem {
  id: string;
  date: string;
  salaryAmount: number;
  bonusAmount: number;
  paymentAmount: number;
  remainingDebt: number;
  comment?: string | null;
  employee?: EmployeeItem | null;
}

export interface CustomerDebtSummaryItem {
  customerId: string;
  customerName: string;
  phone?: string | null;
  saleAmount: number;
  paymentAmount: number;
  bonus: number;
  customerBonus: number;
  remainingDebt: number;
  finalRemainingDebt: number;
  lastSaleDate?: string | null;
}

export interface SupplierDebtSummaryItem {
  supplierId: string;
  supplierName: string;
  purchaseAmount: number;
  paymentAmount: number;
  remainingDebt: number;
}

export interface SalarySummaryItem {
  employeeId: string;
  employeeName: string;
  salaryAmount: number;
  bonusAmount: number;
  paymentAmount: number;
  remainingDebt: number;
}

export interface SalesDashboardSummary {
  totalSalesAmount: number;
  totalPayments: number;
  totalDebt: number;
  totalProfit: number;
  averageMarginPercent: number;
  entries: number;
  recentEntries: SalesEntryItem[];
}

export interface SalesGridSummary {
  totalSaleAmount: number;
  totalPaymentAmount: number;
  totalBonus: number;
  totalCustomerBonus: number;
  totalRemainingDebt: number;
  totalFinalRemainingDebt: number;
  totalCost: number;
  totalProfit: number;
  averageProfitPercent: number;
  rows: number;
}

export interface PurchaseSummary {
  totalPurchaseAmount: number;
  totalPaymentAmount: number;
  totalSupplierDebt: number;
  supplierTotals: SupplierDebtSummaryItem[];
}

export interface SalaryTotalsSummary {
  totalSalaryAmount: number;
  totalBonusAmount: number;
  totalPaymentAmount: number;
  totalRemainingDebt: number;
  employees: SalarySummaryItem[];
}

export interface OrderItemDetail {
  id: string;
  name: string;
  productType: string;
  formatText?: string | null;
  printColorText?: string | null;
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

export interface AuditLogEntry {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  beforeData?: Record<string, unknown> | null;
  afterData?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
  createdAt?: string;
  createdBy?: UserSummary | null;
}

export interface PriceVersionItem {
  id: string;
  version: number;
  costAmount?: number;
  totalAmount?: number;
  profitAmount?: number;
  marginPercent?: number;
  createdAt?: string;
}

export interface CostCalculationLineItem {
  id: string;
  type: string;
  name?: string | null;
  amount: number;
  unitCost?: number;
  quantity?: number;
  comment?: string | null;
}

export interface CostCalculationItem {
  id: string;
  materialCost?: number;
  printingCost?: number;
  prepressCost?: number;
  postpressCost?: number;
  laborCost?: number;
  overheadCost?: number;
  wastePercent?: number;
  profitPercent?: number;
  recommendedPrice?: number;
  lines?: CostCalculationLineItem[];
}

export type CalculationSectionType = 'paper' | 'printing' | 'form' | 'extra_work' | 'other_costs';

export interface CalculationRowItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  total: number;
  note?: string | null;
  paperName?: string | null;
  format?: string | null;
  gramaj?: string | null;
  baseQuantity?: number | null;
  fire?: number | null;
  totalQuantity?: number | null;
  price?: number | null;
  printType?: string | null;
  printSide?: string | null;
  color?: string | null;
  printCount?: number | null;
  printPrice?: number | null;
  formCount?: number | null;
  formPrice?: number | null;
  extraWorkType?: string | null;
}

export interface CalculationSectionItem {
  id: string;
  key: CalculationSectionType;
  title: string;
  total: number;
  rows: CalculationRowItem[];
}

export interface CalculationCustomerSummary {
  id: string;
  name: string;
  companyName?: string | null;
}

export interface CalculationOrderSummary {
  id: string;
  number: string;
  status: string;
  totalAmount?: number;
}

export interface CalculationItem {
  id: string;
  number: string;
  status: 'draft' | 'approved' | 'converted';
  customerId: string;
  customer?: CalculationCustomerSummary | null;
  productName: string;
  quantity: number;
  note?: string | null;
  salePrice: number;
  costPrice: number;
  profit: number;
  saleUnitPrice?: number;
  orderId?: string | null;
  order?: CalculationOrderSummary | null;
  sections: CalculationSectionItem[];
  createdAt?: string;
  updatedAt?: string;
}

export interface CalculationListItem extends CalculationItem {}

export interface CalculationListQueryDto extends PaginationQuery {
  status?: 'draft' | 'approved' | 'converted';
  customerId?: string;
}

export interface CreateCalculationDto {
  customerId: string;
  productName: string;
  quantity: number;
  note?: string;
  status?: 'draft' | 'approved' | 'converted';
  salePrice?: number;
  sections: CalculationSectionItem[];
}

export interface UpdateCalculationDto extends Partial<CreateCalculationDto> {}

export interface ConvertCalculationToOrderResult {
  calculation: CalculationItem;
  order: CalculationOrderSummary;
}

export interface ProductionOperationItem {
  id: string;
  name: string;
  status: string;
  sequenceNo: number;
  plannedDurationMin?: number | null;
  startedAt?: string | null;
  completedAt?: string | null;
  notes?: string | null;
  template?: { id: string; name: string } | null;
  workCenter?: { id: string; name: string } | null;
  machine?: { id: string; name: string } | null;
}

export interface ProductionRouteItem {
  id: string;
  name?: string | null;
  code?: string | null;
  operations?: ProductionOperationItem[];
}

export interface ProductionJobItem {
  id: string;
  number: string;
  status: string;
  plannedStartAt?: string | null;
  deadlineAt?: string | null;
  startedAt?: string | null;
  finishedAt?: string | null;
  notes?: string | null;
  order?: OrderListItem | null;
  route?: ProductionRouteItem | null;
  operations?: ProductionOperationItem[];
}

export interface StockReservationItem {
  id: string;
  status: string;
  quantity: number;
  reservedAt?: string | null;
  releasedAt?: string | null;
  consumedAt?: string | null;
  note?: string | null;
  material?: InventoryMaterialItem | null;
  warehouse?: WarehouseItem | null;
  order?: OrderListItem | null;
}

export interface InventoryMaterialItem {
  id: string;
  name: string;
  sku?: string | null;
  unit: string;
  stockUnit?: string;
  packageUnit?: string | null;
  defaultUnitsPerPackage?: number | null;
  gram?: number | null;
  size?: string | null;
  packPrice?: number;
  quantityInPack?: number;
  unitCost?: number;
  lastPurchasePrice?: number;
  averageCost?: number;
  vatIncluded?: boolean;
  metadata?: Record<string, unknown> | null;
  isActive?: boolean;
  minStockLevel: number;
  onHand?: number;
  reserved?: number;
  available?: number;
  costPrice?: number;
  lastMovementAt?: string | null;
  notes?: string | null;
  category?: MaterialCategoryItem | null;
  supplier?: SupplierItem | null;
}

export interface MaterialCategoryItem {
  id: string;
  code: string;
  name: string;
  codePrefix?: string;
  dynamicFields?: MaterialDynamicField[];
  description?: string | null;
  isActive?: boolean;
}

export interface MaterialDynamicFieldOption {
  label: string;
  value: string;
}

export interface MaterialDynamicField {
  key: string;
  label: string;
  type: 'text' | 'number' | 'select';
  options?: MaterialDynamicFieldOption[];
}

export interface WarehouseItem {
  id: string;
  code: string;
  name: string;
  description?: string | null;
}

export interface InventoryMovementItem {
  id: string;
  type: string;
  displayType?: string;
  quantity: number;
  balanceDelta?: number;
  unitCost?: number;
  totalCost?: number;
  reference?: string | null;
  note?: string | null;
  createdAt?: string;
  material?: InventoryMaterialItem | null;
  warehouse?: WarehouseItem | null;
  order?: OrderListItem | null;
  productionJob?: ProductionJobItem | null;
  purchaseEntry?: PurchaseEntryItem | null;
}

export interface InventoryStockLevelItem {
  warehouse?: WarehouseItem | null;
  onHand: number;
  reserved: number;
  available: number;
}

export interface InventoryMaterialDetail extends InventoryMaterialItem {
  stockLevels?: InventoryStockLevelItem[];
  stockValue?: number;
  lastPurchaseAt?: string | null;
  recentMovements?: InventoryMovementItem[];
}

export interface InvoiceItem {
  id: string;
  number: string;
  status: string;
  totalAmount: number;
  paidAmount: number;
  dueAt?: string | null;
  createdAt?: string;
  order?: OrderListItem | null;
  payments?: PaymentItem[];
  receivable?: DebtItem | null;
}

export interface PaymentItem {
  id: string;
  amount: number;
  method: string;
  status: string;
  paidAt?: string | null;
  reference?: string | null;
  note?: string | null;
  createdAt?: string;
  order?: OrderListItem | null;
  invoice?: InvoiceItem | null;
  cashbox?: CashboxItem | null;
}

export interface CashboxItem {
  id: string;
  code: string;
  name: string;
  currencyCode?: string | null;
  currentBalance: number;
}

export interface DebtItem {
  id: string;
  status: string;
  amount: number;
  paidAmount: number;
  dueAt?: string | null;
  customer?: CustomerSummary | null;
  order?: OrderListItem | null;
  invoice?: InvoiceItem | null;
}

export interface OrderDetail {
  id: string;
  number: string;
  status: string;
  comment?: string | null;
  totalAmount: number;
  paidAmount: number;
  costAmount: number;
  profitAmount: number;
  marginPercent: number;
  customerDebtAmount: number;
  deadlineAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
  customer?: CustomerSummary | null;
  manager?: UserSummary | null;
  items: OrderItemDetail[];
  costCalculation?: CostCalculationItem | null;
  priceVersions: PriceVersionItem[];
  productionRoutes: ProductionRouteItem[];
  productionJobs: ProductionJobItem[];
  stockReservations: StockReservationItem[];
  stockMovements: InventoryMovementItem[];
  invoices: InvoiceItem[];
  payments: PaymentItem[];
  receivable?: DebtItem | null;
  salesEntry?: SalesEntryItem | null;
  profitability: {
    netProfit: number;
    marginPercent: number;
    customerDebtAmount: number;
    isProfitable: boolean;
  };
  auditLogs: AuditLogEntry[];
  activityHistory?: AuditLogEntry[];
}

export interface DashboardRecentOrder extends OrderListItem {
  customer?: CustomerSummary | null;
  manager?: UserSummary | null;
}

export interface DashboardRecentPayment extends PaymentItem {
  order?: OrderListItem | null;
  invoice?: InvoiceItem | null;
  cashbox?: CashboxItem | null;
}

export interface DashboardTopCustomer extends CustomerSummary {
  totalAmount: number;
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
  topCustomers: DashboardTopCustomer[];
  recentOrders: DashboardRecentOrder[];
  recentPayments: DashboardRecentPayment[];
}

export interface InventorySummaryMaterial {
  id: string;
  name: string;
  sku?: string | null;
  unit: string;
  minStockLevel: number;
  onHand: number;
  reserved: number;
  available: number;
  costPrice: number;
  category?: MaterialCategoryItem | null;
}

export interface InventorySummary {
  totalMaterials: number;
  lowStockCount: number;
  totalStockValue: number;
  reservedValue: number;
  materialsBelowMinimum: InventorySummaryMaterial[];
  recentMovements: InventoryMovementItem[];
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

export interface CompanySettings {
  id?: string;
  companyName?: string | null;
  legalName?: string | null;
  taxId?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  bankName?: string | null;
  bankAccount?: string | null;
  iban?: string | null;
  bankCode?: string | null;
  correspondentAccount?: string | null;
  swift?: string | null;
  logoUrl?: string | null;
  notes?: string | null;
}

export interface SettingsReferenceOptions {
  paymentTypes: string[];
  orderStatuses: string[];
  qaimaStatuses: string[];
  productionStages: string[];
}

export interface AppPreferences {
  language: 'az' | 'ru';
}

export interface SystemOptionItem {
  id: string;
  groupKey: string;
  value: string;
  labelAz: string;
  labelRu: string;
  sortOrder: number;
  isActive: boolean;
}

export interface SettingUnitItem extends SystemOptionItem {}

export interface SettingsReferenceGroup {
  key: string;
  label: string;
  items: SystemOptionItem[];
}

export interface ProductionBoard {
  pending: ProductionOperationItem[];
  ready: ProductionOperationItem[];
  in_progress: ProductionOperationItem[];
  paused: ProductionOperationItem[];
  completed: ProductionOperationItem[];
  failed: ProductionOperationItem[];
}
