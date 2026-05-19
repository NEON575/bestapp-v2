import type {
  CreateProductionJobDto,
  PaginatedResponse,
  PaginationQuery,
  ProductionBoard,
  ProductionJobItem,
  UpdateProductionJobDto
} from '@bestapp/shared';
import { api } from './http';
import { buildQueryParams } from './query';

export const productionClient = {
  async jobs(query: PaginationQuery = {}) {
    const { data } = await api.get<PaginatedResponse<ProductionJobItem>>('/production/jobs', {
      params: buildQueryParams(query)
    });
    return data;
  },

  async job(id: string) {
    const { data } = await api.get<ProductionJobItem>(`/production/jobs/${id}`);
    return data;
  },

  async createJob(dto: CreateProductionJobDto) {
    const { data } = await api.post('/production/jobs', dto);
    return data;
  },

  async updateJob(id: string, dto: UpdateProductionJobDto) {
    const { data } = await api.patch(`/production/jobs/${id}`, dto);
    return data;
  },

  async removeJob(id: string) {
    const { data } = await api.delete(`/production/jobs/${id}`);
    return data;
  },

  async board() {
    const { data } = await api.get<ProductionBoard>('/production/board');
    return data;
  }
};

