import type {
  CalculationConvertResult,
  CalculationFormValues,
  CalculationListQuery,
  CalculationRecord,
  PaginatedResponse
} from '@bestapp/shared';
import { api } from './http';
import { buildQueryParams } from './query';

export const calculationsClient = {
  async list(query: CalculationListQuery = {}) {
    const { data } = await api.get<PaginatedResponse<CalculationRecord>>('/calculations', {
      params: buildQueryParams(query)
    });
    return data;
  },

  async get(id: string) {
    const { data } = await api.get<CalculationRecord>(`/calculations/${id}`);
    return data;
  },

  async create(dto: CalculationFormValues) {
    const { data } = await api.post<CalculationRecord>('/calculations', dto);
    return data;
  },

  async update(id: string, dto: CalculationFormValues) {
    const { data } = await api.patch<CalculationRecord>(`/calculations/${id}`, dto);
    return data;
  },

  async convertToOrder(id: string) {
    const { data } = await api.post<CalculationConvertResult>(`/calculations/${id}/convert-to-order`);
    return data;
  }
};
