import type {
  CreatePurchaseEntryDto,
  CreateSupplierDto,
  PaginatedResponse,
  PurchaseEntryItem,
  PurchaseEntryQueryDto,
  PurchaseSummary,
  SupplierDebtSummaryItem,
  SupplierItem,
  UpdatePurchaseEntryDto,
  UpdateSupplierDto
} from '@bestapp/shared';
import { api } from './http';
import { buildQueryParams } from './query';

export const purchasesClient = {
  async list(query: PurchaseEntryQueryDto = {}) {
    const { data } = await api.get<PaginatedResponse<PurchaseEntryItem>>('/purchases', {
      params: buildQueryParams(query)
    });
    return data;
  },

  async create(dto: CreatePurchaseEntryDto) {
    const { data } = await api.post<PurchaseEntryItem>('/purchases', dto);
    return data;
  },

  async update(id: string, dto: UpdatePurchaseEntryDto) {
    const { data } = await api.patch<PurchaseEntryItem>(`/purchases/${id}`, dto);
    return data;
  },

  async summary() {
    const { data } = await api.get<PurchaseSummary>('/purchases/summary');
    return data;
  },

  async supplierDebts(supplierId?: string) {
    const { data } = await api.get<SupplierDebtSummaryItem[]>('/purchases/supplier-debts', {
      params: supplierId ? { supplierId } : undefined
    });
    return data;
  },

  async listSuppliers() {
    const { data } = await api.get<SupplierItem[]>('/purchases/suppliers');
    return data;
  },

  async createSupplier(dto: CreateSupplierDto) {
    const { data } = await api.post<SupplierItem>('/purchases/suppliers', dto);
    return data;
  },

  async updateSupplier(id: string, dto: UpdateSupplierDto) {
    const { data } = await api.patch<SupplierItem>(`/purchases/suppliers/${id}`, dto);
    return data;
  }
};

