import type { AuthSession, LoginDto } from '@bestapp/shared';
import { api } from './http';

export const authClient = {
  async login(input: LoginDto) {
    const { data } = await api.post<AuthSession>('/auth/login', input);
    return data;
  },

  async me() {
    const { data } = await api.get('/auth/me');
    return data;
  }
};

