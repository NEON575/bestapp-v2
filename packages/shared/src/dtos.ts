export interface CreateCustomerDto {
  name: string;
  companyName?: string;
  phone?: string;
  email?: string;
  address?: string;
  notes?: string;
}

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
