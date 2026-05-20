export interface CreateCustomerDto {
  name: string;
  companyName?: string;
  phone?: string;
  email?: string;
  address?: string;
  notes?: string;
}

export interface UpdateCustomerDto extends Partial<CreateCustomerDto> {}

export interface PaginationQueryDto {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  dateFrom?: string;
  dateTo?: string;
}

export interface OrderListQueryDto extends PaginationQueryDto {
  status?: string;
  customerId?: string;
  managerId?: string;
  deadlineFrom?: string;
  deadlineTo?: string;
  hasDebt?: boolean;
  inProduction?: boolean;
  overdue?: boolean;
}

export interface CreateOrderItemDto {
  name: string;
  productType: string;
  width: number;
  height: number;
  quantity: number;
  colorMode: string;
  materialId?: string;
  finishingOptions?: string;
  unitCost?: number;
  totalCost?: number;
  unitPrice: number;
  totalPrice: number;
  comment?: string;
}

export interface CreateOrderDto {
  number?: string;
  customerId: string;
  managerId?: string;
  status?: string;
  deadlineAt?: string;
  comment?: string;
  items?: CreateOrderItemDto[];
}

export interface UpdateOrderDto extends Partial<CreateOrderDto> {}

export interface CreateMaterialDto {
  categoryId?: string;
  supplierId?: string;
  name: string;
  sku?: string;
  unit: string;
  gram?: number;
  size?: string;
  packPrice?: number;
  quantityInPack?: number;
  unitCost?: number;
  vatIncluded?: boolean;
  minStockLevel?: number;
  stockQuantity?: number;
  reservedQuantity?: number;
  costPrice?: number;
  notes?: string;
}

export interface UpdateMaterialDto extends Partial<CreateMaterialDto> {}

export interface MaterialQueryDto extends PaginationQueryDto {
  categoryId?: string;
  supplierId?: string;
  gram?: number;
  size?: string;
  lowStockOnly?: boolean;
}

export interface CreateInvoiceDto {
  orderId: string;
  number: string;
  status?: string;
  totalAmount: number;
  paidAmount?: number;
  dueAt?: string;
}

export interface UpdateInvoiceDto extends Partial<CreateInvoiceDto> {}

export interface CreatePaymentDto {
  orderId?: string;
  invoiceId?: string;
  cashboxId?: string;
  amount: number;
  method: string;
  status?: string;
  paidAt?: string;
  reference?: string;
  note?: string;
  createdById?: string;
}

export interface UpdatePaymentDto extends Partial<CreatePaymentDto> {}

export interface ReserveStockDto {
  orderId: string;
  orderItemId?: string;
  materialId: string;
  warehouseId: string;
  quantity: number;
  note?: string;
}

export interface WriteOffStockDto {
  materialId: string;
  warehouseId?: string;
  reservationId?: string;
  orderId?: string;
  productionJobId?: string;
  quantity: number;
  note?: string;
}

export interface CreateStockMovementDto {
  materialId: string;
  warehouseId?: string;
  orderId?: string;
  orderItemId?: string;
  productionJobId?: string;
  type: string;
  quantity: number;
  unitCost?: number;
  totalCost?: number;
  reference?: string;
  note?: string;
}

export interface CreateProductionJobDto {
  orderId: string;
  routeId?: string;
  number: string;
  status?: string;
  plannedStartAt?: string;
  deadlineAt?: string;
  notes?: string;
}

export interface UpdateProductionJobDto extends Partial<CreateProductionJobDto> {}

export interface CreateProductionOperationDto {
  routeId?: string;
  productionJobId?: string;
  templateId?: string;
  workCenterId?: string;
  machineId?: string;
  sequenceNo: number;
  name: string;
  status?: string;
  plannedDurationMin?: number;
  startedAt?: string;
  completedAt?: string;
  notes?: string;
}

export interface UpdateProductionOperationDto extends Partial<CreateProductionOperationDto> {}

export interface CreateCashboxDto {
  code: string;
  name: string;
  currencyCode?: string;
  openingBalance?: number;
}

export interface UpdateCashboxDto extends Partial<CreateCashboxDto> {}

export interface CreateSalesEntryDto {
  orderId?: string;
  customerId: string;
  managerId?: string;
  paperId?: string;
  date?: string;
  category?: string;
  productName: string;
  quantity: number;
  saleAmount: number;
  paymentAmount?: number;
  paymentType?: string;
  bonus?: number;
  customerBonus?: number;
  productionStage?: string;
  deliveryStatus?: string;
  deliveryDate?: string;
  paymentStatus?: string;
  qaimaStatus?: string;
  qaimaDate?: string;
  qaimaNumber?: string;
  printColor?: string;
  printType?: string;
  paperCost?: number;
  plateCost?: number;
  printCost?: number;
  specialCutCost?: number;
  knifeCost?: number;
  manualWorkCost?: number;
  spiralCost?: number;
  poniCost?: number;
  otherCost?: number;
  laminationCost?: number;
  spiralType?: string;
  spiralQuantity?: number;
  spiralUnitCost?: number;
  spiralTotalCost?: number;
  invoiceStatusText?: string;
  notes?: string;
}

export interface UpdateSalesEntryDto extends Partial<CreateSalesEntryDto> {}

export interface QuickCreateSalesEntryDto {
  customerId: string;
  managerId?: string;
  date?: string;
  productName: string;
  quantity: number;
  saleAmount: number;
}

export interface UpdateOrderHesablamaDto {
  paperId?: string;
  category?: string;
  productName?: string;
  quantity?: number;
  saleAmount?: number;
  paymentAmount?: number;
  paymentType?: string;
  bonus?: number;
  customerBonus?: number;
  productionStage?: string;
  deliveryStatus?: string;
  deliveryDate?: string;
  paymentStatus?: string;
  qaimaStatus?: string;
  qaimaDate?: string;
  qaimaNumber?: string;
  printColor?: string;
  printType?: string;
  paperCost?: number;
  plateCost?: number;
  printCost?: number;
  specialCutCost?: number;
  knifeCost?: number;
  manualWorkCost?: number;
  spiralCost?: number;
  poniCost?: number;
  otherCost?: number;
  laminationCost?: number;
  spiralType?: string;
  spiralQuantity?: number;
  spiralUnitCost?: number;
  spiralTotalCost?: number;
  invoiceStatusText?: string;
  notes?: string;
}

export interface SalesEntryQueryDto extends PaginationQueryDto {
  customerId?: string;
  managerId?: string;
  paymentType?: string;
  deliveryStatus?: string;
  productionStage?: string;
  category?: string;
  qaimaStatus?: string;
  paymentStatus?: string;
  hasDebt?: boolean;
  onlyUndelivered?: boolean;
}

export interface CreateSupplierDto {
  code?: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  notes?: string;
  isActive?: boolean;
}

export interface UpdateSupplierDto extends Partial<CreateSupplierDto> {}

export interface CreatePaperDto {
  supplierId?: string;
  code: string;
  name: string;
  gram: number;
  size: string;
  packPrice: number;
  sheetsInPack: number;
  vatIncluded?: boolean;
  unit?: string;
  notes?: string;
}

export interface UpdatePaperDto extends Partial<CreatePaperDto> {}

export interface CreatePurchaseEntryDto {
  supplierId: string;
  date?: string;
  amount: number;
  paymentAmount?: number;
  paymentType?: string;
  comment?: string;
}

export interface UpdatePurchaseEntryDto extends Partial<CreatePurchaseEntryDto> {}

export interface PurchaseEntryQueryDto extends PaginationQueryDto {
  supplierId?: string;
  paymentType?: string;
  onlyDebtors?: boolean;
}

export interface CreateEmployeeDto {
  fullName: string;
  phone?: string;
  title?: string;
  isActive?: boolean;
}

export interface UpdateEmployeeDto extends Partial<CreateEmployeeDto> {}

export interface CreateSalaryEntryDto {
  employeeId: string;
  date?: string;
  salaryAmount: number;
  bonusAmount?: number;
  paymentAmount?: number;
  comment?: string;
}

export interface UpdateSalaryEntryDto extends Partial<CreateSalaryEntryDto> {}

export interface SalaryEntryQueryDto extends PaginationQueryDto {
  employeeId?: string;
}

export interface PaperQueryDto extends PaginationQueryDto {
  supplierId?: string;
  gram?: number;
  size?: string;
}

export interface ExcelImportPreviewSheetDto {
  name: string;
  rows: number;
  columns: string[];
  mappingErrors: string[];
}
