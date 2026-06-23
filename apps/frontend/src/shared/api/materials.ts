import { api } from './http';
import type { CreateMaterialDto, MaterialListItem, MaterialListQueryDto, UpdateMaterialDto } from '../materials';

interface PaginatedResponse<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

function buildQueryParams(query: Record<string, unknown>) {
  return Object.entries(query).reduce<Record<string, string | number | boolean>>((acc, [key, value]) => {
    if (value === undefined || value === null || value === '') {
      return acc;
    }

    acc[key] = value as string | number | boolean;
    return acc;
  }, {});
}

export const materialsClient = {
  async list(query: MaterialListQueryDto = {}) {
    const { data } = await api.get<PaginatedResponse<MaterialListItem>>('/materials', {
      params: buildQueryParams(query)
    });
    return data;
  },

  async get(id: string) {
    const { data } = await api.get<MaterialListItem>(`/materials/${id}`);
    return data;
  },

  async create(dto: CreateMaterialDto) {
    const { data } = await api.post<MaterialListItem>('/materials', dto);
    return data;
  },

  async update(id: string, dto: UpdateMaterialDto) {
    const { data } = await api.patch<MaterialListItem>(`/materials/${id}`, dto);
    return data;
  },

  async remove(id: string) {
    const { data } = await api.delete<MaterialListItem>(`/materials/${id}`);
    return data;
  }
};

