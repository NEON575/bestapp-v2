export interface CreateCustomerDto {
  name: string;
  companyName?: string;
  phone?: string;
  email?: string;
  address?: string;
  notes?: string;
}

export interface CreateOrderItemDto {
  name: string;
  quantity: number;
  unitPrice: number;
  comment?: string;
}

export interface CreateOrderDto {
  number: string;
  customerId: string;
  status?: string;
  productionStatus?: string;
  dueDate?: string;
  comment?: string;
  items?: CreateOrderItemDto[];
}

