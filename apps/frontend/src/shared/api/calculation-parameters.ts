import type {
  CalculationParameterCreateDto,
  CalculationParameterItem,
  CalculationParameterListQuery,
  CalculationParameterUpdateDto,
  PaginatedResponse
} from '@bestapp/shared';
import { api } from './http';
import { buildQueryParams } from './query';

export const calculationParametersClient = {
  async list(query: CalculationParameterListQuery = {}) {
    const { data } = await api.get<PaginatedResponse<CalculationParameterItem>>('/calculation-parameters', {
      params: buildQueryParams(query)
    });
    return data;
  },

  async get(id: string) {
    const { data } = await api.get<CalculationParameterItem>(`/calculation-parameters/${id}`);
    return data;
  },

  async create(dto: CalculationParameterCreateDto) {
    const { data } = await api.post<CalculationParameterItem>('/calculation-parameters', dto);
    return data;
  },

  async update(id: string, dto: CalculationParameterUpdateDto) {
    const { data } = await api.patch<CalculationParameterItem>(`/calculation-parameters/${id}`, dto);
    return data;
  },

  async remove(id: string) {
    const { data } = await api.delete<CalculationParameterItem>(`/calculation-parameters/${id}`);
    return data;
  }
};
