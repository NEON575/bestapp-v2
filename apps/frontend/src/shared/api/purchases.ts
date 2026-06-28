import type {
  CreatePurchaseDto,
  CreatePurchaseEntryDto,
  CreateSupplierDto,
  PaginatedResponse,
  Purchase,
  PurchaseEntryItem,
  PurchaseEntryQueryDto,
  PurchaseListQueryDto,
  PurchaseSummary,
  SupplierDebtSummaryItem,
  SupplierItem,
  UpdatePurchaseDto,
  UpdatePurchaseEntryDto,
  UpdateSupplierDto
} from '@bestapp/shared';
import { api } from './http';
import { buildQueryParams } from './query';

export const purchasesClient = {
  async list(query: PurchaseListQueryDto = {}) {
    const { data } = await api.get<PaginatedResponse<Purchase>>('/purchases', {
      params: buildQueryParams(query)
    });
    return data;
  },

  async get(id: string) {
    const { data } = await api.get<Purchase>(`/purchases/${id}`);
    return data;
  },

  async create(dto: CreatePurchaseDto) {
    const { data } = await api.post<Purchase>('/purchases', dto);
    return data;
  },

  async update(id: string, dto: UpdatePurchaseDto) {
    const { data } = await api.patch<Purchase>(`/purchases/${id}`, dto);
    return data;
  },

  async remove(id: string) {
    const { data } = await api.delete<{ success: boolean }>(`/purchases/${id}`);
    return data;
  },

  async confirm(id: string) {
    const { data } = await api.post<Purchase>(`/purchases/${id}/confirm`);
    return data;
  },

  async cancel(id: string) {
    const { data } = await api.post<Purchase>(`/purchases/${id}/cancel`);
    return data;
  },

  async summary(query: PurchaseEntryQueryDto = {}) {
    const { data } = await api.get<PurchaseSummary>('/purchases/summary', {
      params: buildQueryParams(query)
    });
    return data;
  },

  async supplierDebts(supplierId?: string) {
    const { data } = await api.get<SupplierDebtSummaryItem[]>('/purchases/supplier-debts', {
      params: supplierId ? { supplierId } : undefined
    });
    return data;
  },

  async listSuppliers() {
    const { data } = await api.get<SupplierItem[]>('/suppliers');
    return data;
  },

  async createSupplier(dto: CreateSupplierDto) {
    const { data } = await api.post<SupplierItem>('/suppliers', dto);
    return data;
  },

  async updateSupplier(id: string, dto: UpdateSupplierDto) {
    const { data } = await api.patch<SupplierItem>(`/suppliers/${id}`, dto);
    return data;
  },

  async removeSupplier(id: string) {
    const { data } = await api.delete<SupplierItem>(`/suppliers/${id}`);
    return data;
  },

  async legacyList(query: PurchaseEntryQueryDto = {}) {
    const { data } = await api.get<PaginatedResponse<PurchaseEntryItem>>('/purchase-entries', {
      params: buildQueryParams(query)
    });
    return data;
  },

  async legacyCreate(dto: CreatePurchaseEntryDto) {
    const { data } = await api.post<PurchaseEntryItem>('/purchase-entries', dto);
    return data;
  },

  async legacyUpdate(id: string, dto: UpdatePurchaseEntryDto) {
    const { data } = await api.patch<PurchaseEntryItem>(`/purchase-entries/${id}`, dto);
    return data;
  }
};
