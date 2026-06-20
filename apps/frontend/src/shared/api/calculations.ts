import type {
  CalculationItem,
  CalculationListItem,
  CalculationListQueryDto,
  ConvertCalculationToOrderResult,
  CreateCalculationDto,
  PaginatedResponse,
  UpdateCalculationDto
} from '@bestapp/shared';
import { api } from './http';
import { buildQueryParams } from './query';

export const calculationsClient = {
  async list(query: CalculationListQueryDto = {}) {
    const { data } = await api.get<PaginatedResponse<CalculationListItem>>('/calculations', {
      params: buildQueryParams(query)
    });
    return data;
  },

  async get(id: string) {
    const { data } = await api.get<CalculationItem>(`/calculations/${id}`);
    return data;
  },

  async create(dto: CreateCalculationDto) {
    const { data } = await api.post<CalculationItem>('/calculations', dto);
    return data;
  },

  async update(id: string, dto: UpdateCalculationDto) {
    const { data } = await api.patch<CalculationItem>(`/calculations/${id}`, dto);
    return data;
  },

  async convertToOrder(id: string) {
    const { data } = await api.post<ConvertCalculationToOrderResult>(`/calculations/${id}/convert-to-order`);
    return data;
  }
};
