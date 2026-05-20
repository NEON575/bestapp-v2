import type { UserSummary } from '@bestapp/shared';
import { api } from './http';

export const usersClient = {
  async list() {
    const { data } = await api.get<UserSummary[]>('/users');
    return data;
  },

  async listManagers() {
    const { data } = await api.get<UserSummary[]>('/users/managers');
    return data;
  }
};
