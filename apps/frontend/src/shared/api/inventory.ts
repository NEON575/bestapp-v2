import type {
  CreateMaterialCategoryDto,
  CreateMaterialDto,
  CreateStockMovementDto,
  InventoryMaterialItem,
  InventoryMovementItem,
  InventorySummary,
  MaterialQueryDto,
  PaginationQuery,
  PaginatedResponse,
  ReserveStockDto,
  UpdateMaterialCategoryDto,
  UpdateMaterialDto,
  WriteOffStockDto,
  WarehouseItem,
  MaterialCategoryItem
} from '@bestapp/shared';
import { api } from './http';
import { buildQueryParams } from './query';

export const inventoryClient = {
  async summary() {
    const { data } = await api.get<InventorySummary>('/inventory/summary');
    return data;
  },

  async materials(query: MaterialQueryDto = {}) {
    const { data } = await api.get<PaginatedResponse<InventoryMaterialItem>>('/inventory/materials', {
      params: buildQueryParams(query)
    });
    return data;
  },

  async material(id: string) {
    const { data } = await api.get<InventoryMaterialItem>(`/inventory/materials/${id}`);
    return data;
  },

  async createMaterial(dto: CreateMaterialDto) {
    const { data } = await api.post('/inventory/materials', dto);
    return data;
  },

  async updateMaterial(id: string, dto: UpdateMaterialDto) {
    const { data } = await api.patch(`/inventory/materials/${id}`, dto);
    return data;
  },

  async removeMaterial(id: string) {
    const { data } = await api.delete(`/inventory/materials/${id}`);
    return data;
  },

  async movements(query: PaginationQuery = {}) {
    const { data } = await api.get<PaginatedResponse<InventoryMovementItem>>('/inventory/movements', {
      params: buildQueryParams(query)
    });
    return data;
  },

  async createMovement(dto: CreateStockMovementDto) {
    const { data } = await api.post('/inventory/movements', dto);
    return data;
  },

  async reserve(dto: ReserveStockDto) {
    const { data } = await api.post('/inventory/reserve', dto);
    return data;
  },

  async releaseReservation(id: string) {
    const { data } = await api.post(`/inventory/reservations/${id}/release`);
    return data;
  },

  async consumeReservation(id: string) {
    const { data } = await api.post(`/inventory/reservations/${id}/consume`);
    return data;
  },

  async writeOff(dto: WriteOffStockDto) {
    const { data } = await api.post('/inventory/write-off', dto);
    return data;
  },

  async warehouses() {
    const { data } = await api.get<WarehouseItem[]>('/inventory/warehouses');
    return data;
  },

  async categories() {
    const { data } = await api.get<MaterialCategoryItem[]>('/inventory/categories');
    return data;
  },

  async createCategory(dto: CreateMaterialCategoryDto) {
    const { data } = await api.post<MaterialCategoryItem>('/inventory/categories', dto);
    return data;
  },

  async updateCategory(id: string, dto: UpdateMaterialCategoryDto) {
    const { data } = await api.patch<MaterialCategoryItem>(`/inventory/categories/${id}`, dto);
    return data;
  },

  async removeCategory(id: string) {
    const { data } = await api.delete(`/inventory/categories/${id}`);
    return data;
  }
};
