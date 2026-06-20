import type {
  CalculationConvertResult,
  CalculationCreateDto,
  CalculationListItem,
  CalculationListQuery,
  CalculationUpdateDto,
  PaginatedResponse
} from '@bestapp/shared';
import { api } from './http';
import { buildQueryParams } from './query';

export const calculationsClient = {
  async list(query: CalculationListQuery = {}) {
    const { data } = await api.get<PaginatedResponse<CalculationListItem>>('/calculations', {
      params: buildQueryParams(query)
    });
    return data;
  },

  async get(id: string) {
    const { data } = await api.get<CalculationListItem>(`/calculations/${id}`);
    return data;
  },

  async create(dto: CalculationCreateDto) {
    const { data } = await api.post<CalculationListItem>('/calculations', dto);
    return data;
  },

  async update(id: string, dto: CalculationUpdateDto) {
    const { data } = await api.patch<CalculationListItem>(`/calculations/${id}`, dto);
    return data;
  },

  async convertToOrder(id: string) {
    const { data } = await api.post<CalculationConvertResult>(`/calculations/${id}/convert-to-order`);
    return data;
  }
};
