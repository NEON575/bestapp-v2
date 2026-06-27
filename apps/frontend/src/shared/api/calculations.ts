import { api } from './http';
import { buildQueryParams } from './query';

export type CalculationStatus = 'draft' | 'approved' | 'converted' | 'cancelled';

export type CalculationMaterialLinePayload = {
  materialId: string;
  quantity: number;
  unit: string;
  unitCost?: number;
};

export type CalculationServiceLinePayload = {
  serviceName: string;
  quantity: number;
  unit: string;
  unitPrice?: number;
};

export type CalculationPayload = {
  customerName?: string;
  productName: string;
  quantity: number;
  note?: string;
  profitPercent?: number;
  finalPrice?: number;
  status?: CalculationStatus;
  materialLines: CalculationMaterialLinePayload[];
  serviceLines: CalculationServiceLinePayload[];
};

export type CalculationSections = {
  materialLines: Array<{
    materialId: string;
    materialName: string;
    quantity: number;
    unit: string;
    unitCost: number;
    totalCost: number;
    availableStock: number;
  }>;
  serviceLines: Array<{
    serviceName: string;
    quantity: number;
    unit: string;
    unitPrice: number;
    totalCost: number;
  }>;
};

export type CalculationRecord = {
  id: string;
  number: string;
  customerName: string;
  productName: string;
  quantity: number;
  note?: string | null;
  status: CalculationStatus;
  materialCost: number;
  serviceCost: number;
  totalCost: number;
  profitPercent: number;
  profitAmount: number;
  salePrice: number;
  finalPrice: number;
  costPrice: number;
  profit: number;
  sections: CalculationSections;
  createdAt: string;
  updatedAt: string;
  cancelledAt?: string | null;
};

export type CalculationListQuery = {
  page?: number;
  limit?: number;
  search?: string;
  status?: CalculationStatus | '';
};

type PaginatedResponse<T> = {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

export const calculationsClient = {
  async list(query: CalculationListQuery = {}) {
    const { data } = await api.get<PaginatedResponse<CalculationRecord>>('/calculations', {
      params: buildQueryParams(query)
    });
    return data;
  },

  async get(id: string) {
    const { data } = await api.get<CalculationRecord>(`/calculations/${id}`);
    return data;
  },

  async create(dto: CalculationPayload) {
    const { data } = await api.post<CalculationRecord>('/calculations', dto);
    return data;
  },

  async update(id: string, dto: CalculationPayload) {
    const { data } = await api.patch<CalculationRecord>(`/calculations/${id}`, dto);
    return data;
  },

  async remove(id: string) {
    const { data } = await api.delete<{ success: boolean }>(`/calculations/${id}`);
    return data;
  },

  async approve(id: string) {
    const { data } = await api.post<CalculationRecord>(`/calculations/${id}/approve`);
    return data;
  },

  async cancel(id: string) {
    const { data } = await api.post<CalculationRecord>(`/calculations/${id}/cancel`);
    return data;
  }
};
