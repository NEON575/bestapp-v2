import type {
  CreateCustomerDto,
  CustomerListItem,
  PaginatedResponse,
  PaginationQuery,
  UpdateCustomerDto
} from '@bestapp/shared';
import { api } from './http';
import { buildQueryParams } from './query';

export const customersClient = {
  async list(query: PaginationQuery = {}) {
    const { data } = await api.get<PaginatedResponse<CustomerListItem>>('/customers', {
      params: buildQueryParams(query)
    });
    return data;
  },

  async get(id: string) {
    const { data } = await api.get<CustomerListItem>(`/customers/${id}`);
    return data;
  },

  async create(dto: CreateCustomerDto) {
    const { data } = await api.post('/customers', dto);
    return data;
  },

  async update(id: string, dto: UpdateCustomerDto) {
    const { data } = await api.patch(`/customers/${id}`, dto);
    return data;
  },

  async remove(id: string) {
    const { data } = await api.delete(`/customers/${id}`);
    return data;
  }
};

