import type { PaginatedResponse, PaginationQuery, Supplier, CreateSupplierDto, UpdateSupplierDto } from '@bestapp/shared';
import { api } from './http';
import { buildQueryParams } from './query';

export type SupplierListQuery = PaginationQuery & {
  status?: 'all' | 'active' | 'inactive';
};

export const suppliersClient = {
  async list(query: SupplierListQuery = {}) {
    const { data } = await api.get<PaginatedResponse<Supplier>>('/suppliers', {
      params: buildQueryParams(query)
    });
    return data;
  },

  async get(id: string) {
    const { data } = await api.get<Supplier>(`/suppliers/${id}`);
    return data;
  },

  async create(dto: CreateSupplierDto) {
    const { data } = await api.post<Supplier>('/suppliers', dto);
    return data;
  },

  async update(id: string, dto: UpdateSupplierDto) {
    const { data } = await api.patch<Supplier>(`/suppliers/${id}`, dto);
    return data;
  },

  async remove(id: string) {
    const { data } = await api.delete<Supplier>(`/suppliers/${id}`);
    return data;
  }
};
