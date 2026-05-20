import type {
  CreatePaperDto,
  PaginatedResponse,
  PaperItem,
  PaginationQueryDto,
  UpdatePaperDto
} from '@bestapp/shared';
import { api } from './http';
import { buildQueryParams } from './query';

export const papersClient = {
  async list(query: PaginationQueryDto & { supplierId?: string } = {}) {
    const { data } = await api.get<PaginatedResponse<PaperItem>>('/papers', {
      params: buildQueryParams(query)
    });
    return data;
  },

  async create(dto: CreatePaperDto) {
    const { data } = await api.post<PaperItem>('/papers', dto);
    return data;
  },

  async update(id: string, dto: UpdatePaperDto) {
    const { data } = await api.patch<PaperItem>(`/papers/${id}`, dto);
    return data;
  }
};

