import type { DashboardSummary } from '@bestapp/shared';
import { api } from './http';

export const analyticsClient = {
  async dashboard() {
    const { data } = await api.get<DashboardSummary>('/analytics/dashboard');
    return data;
  }
};

