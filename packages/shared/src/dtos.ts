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
  name: string;
  sku?: string;
  unit: string;
  minStockLevel?: number;
  stockQuantity?: number;
  reservedQuantity?: number;
  costPrice?: number;
}

export interface UpdateMaterialDto extends Partial<CreateMaterialDto> {}

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
