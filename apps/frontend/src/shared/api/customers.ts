import type {
  CreateCustomerDto,
  Customer,
  CustomerListItem,
  PaginatedResponse,
  PaginationQuery,
  UpdateCustomerDto
} from '@bestapp/shared';
import { api } from './http';
import { buildQueryParams } from './query';

export type CustomerListQuery = PaginationQuery & {
  status?: 'all' | 'active' | 'inactive';
};

export const customersClient = {
  async list(query: CustomerListQuery = {}) {
    const { data } = await api.get<PaginatedResponse<CustomerListItem>>('/customers', {
      params: buildQueryParams(query)
    });
    return data;
  },

  async get(id: string) {
    const { data } = await api.get<Customer>(`/customers/${id}`);
    return data;
  },

  async create(dto: CreateCustomerDto) {
    const { data } = await api.post<Customer>('/customers', dto);
    return data;
  },

  async update(id: string, dto: UpdateCustomerDto) {
    const { data } = await api.patch<Customer>(`/customers/${id}`, dto);
    return data;
  },

  async remove(id: string) {
    const { data } = await api.delete<Customer>(`/customers/${id}`);
    return data;
  }
};
