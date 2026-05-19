import type {
  CashboxItem,
  CreateCashboxDto,
  CreateInvoiceDto,
  CreatePaymentDto,
  FinanceSummary,
  InvoiceItem,
  PaginatedResponse,
  PaginationQuery,
  PaymentItem,
  UpdateCashboxDto,
  UpdateInvoiceDto,
  UpdatePaymentDto
} from '@bestapp/shared';
import { api } from './http';
import { buildQueryParams } from './query';

export const financeClient = {
  async summary() {
    const { data } = await api.get<FinanceSummary>('/finance/summary');
    return data;
  },

  async invoices(query: PaginationQuery = {}) {
    const { data } = await api.get<PaginatedResponse<InvoiceItem>>('/finance/invoices', {
      params: buildQueryParams(query)
    });
    return data;
  },

  async invoice(id: string) {
    const { data } = await api.get<InvoiceItem>(`/finance/invoices/${id}`);
    return data;
  },

  async createInvoice(dto: CreateInvoiceDto) {
    const { data } = await api.post('/finance/invoices', dto);
    return data;
  },

  async updateInvoice(id: string, dto: UpdateInvoiceDto) {
    const { data } = await api.patch(`/finance/invoices/${id}`, dto);
    return data;
  },

  async payments(query: PaginationQuery = {}) {
    const { data } = await api.get<PaginatedResponse<PaymentItem>>('/finance/payments', {
      params: buildQueryParams(query)
    });
    return data;
  },

  async payment(id: string) {
    const { data } = await api.get<PaymentItem>(`/finance/payments/${id}`);
    return data;
  },

  async createPayment(dto: CreatePaymentDto) {
    const { data } = await api.post('/finance/payments', dto);
    return data;
  },

  async updatePayment(id: string, dto: UpdatePaymentDto) {
    const { data } = await api.patch(`/finance/payments/${id}`, dto);
    return data;
  },

  async reversePayment(id: string) {
    const { data } = await api.delete(`/finance/payments/${id}`);
    return data;
  },

  async cashboxes() {
    const { data } = await api.get<CashboxItem[]>('/finance/cashboxes');
    return data;
  },

  async createCashbox(dto: CreateCashboxDto) {
    const { data } = await api.post('/finance/cashboxes', dto);
    return data;
  },

  async updateCashbox(id: string, dto: UpdateCashboxDto) {
    const { data } = await api.patch(`/finance/cashboxes/${id}`, dto);
    return data;
  }
};

