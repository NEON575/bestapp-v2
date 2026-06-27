import type { PaginationQuery, PaginatedResponse, WarehouseItem, WarehouseMovementItem, WarehouseStockLevelItem } from '@bestapp/shared';
import { api } from './http';
import { buildQueryParams } from './query';

export type CreateWarehousePayload = {
  code: string;
  name: string;
  description?: string;
};

export type WarehouseFilterQuery = PaginationQuery & {
  warehouseId?: string;
};

export const warehousesClient = {
  async list() {
    const { data } = await api.get<WarehouseItem[]>('/warehouses');
    return data;
  },

  async create(dto: CreateWarehousePayload) {
    const { data } = await api.post<WarehouseItem>('/warehouses', dto);
    return data;
  },

  async levels(query: WarehouseFilterQuery = {}) {
    const { data } = await api.get<PaginatedResponse<WarehouseStockLevelItem>>('/warehouse/levels', {
      params: buildQueryParams(query)
    });
    return data;
  },

  async movements(query: WarehouseFilterQuery = {}) {
    const { data } = await api.get<PaginatedResponse<WarehouseMovementItem>>('/warehouse/movements', {
      params: buildQueryParams(query)
    });
    return data;
  }
};
