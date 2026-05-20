import type {
  CreateSalesEntryDto,
  CustomerDebtSummaryItem,
  PaginatedResponse,
  SalesDashboardSummary,
  SalesEntryItem,
  SalesEntryQueryDto,
  UpdateSalesEntryDto
} from '@bestapp/shared';
import { api } from './http';
import { buildQueryParams } from './query';

export const salesClient = {
  async list(query: SalesEntryQueryDto = {}) {
    const { data } = await api.get<PaginatedResponse<SalesEntryItem>>('/sales', {
      params: buildQueryParams(query)
    });
    return data;
  },

  async get(id: string) {
    const { data } = await api.get<SalesEntryItem>(`/sales/${id}`);
    return data;
  },

  async create(dto: CreateSalesEntryDto) {
    const { data } = await api.post<SalesEntryItem>('/sales', dto);
    return data;
  },

  async update(id: string, dto: UpdateSalesEntryDto) {
    const { data } = await api.patch<SalesEntryItem>(`/sales/${id}`, dto);
    return data;
  },

  async dashboard() {
    const { data } = await api.get<SalesDashboardSummary>('/sales/dashboard');
    return data;
  },

  async customerDebts(customerId?: string) {
    const { data } = await api.get<CustomerDebtSummaryItem[]>('/sales/customer-debts', {
      params: customerId ? { customerId } : undefined
    });
    return data;
  }
};

