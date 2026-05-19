import type { DebtItem, PaginatedResponse, PaginationQuery } from '@bestapp/shared';
import { api } from './http';
import { buildQueryParams } from './query';

export const debtsClient = {
  async receivables(query: PaginationQuery = {}) {
    const { data } = await api.get<PaginatedResponse<DebtItem>>('/debts/receivables', {
      params: buildQueryParams(query)
    });
    return data;
  },

  async payables(query: PaginationQuery = {}) {
    const { data } = await api.get<PaginatedResponse<DebtItem>>('/debts/payables', {
      params: buildQueryParams(query)
    });
    return data;
  }
};

