import type {
  CreateOrderDto,
  OrderDetail,
  OrderListItem,
  OrderListQueryDto,
  PaginatedResponse,
  UpdateOrderDto
} from '@bestapp/shared';
import { api } from './http';
import { buildQueryParams } from './query';

export const ordersClient = {
  async list(query: OrderListQueryDto = {}) {
    const { data } = await api.get<PaginatedResponse<OrderListItem>>('/orders', {
      params: buildQueryParams(query)
    });
    return data;
  },

  async get(id: string) {
    const { data } = await api.get<OrderDetail>(`/orders/${id}`);
    return data;
  },

  async create(dto: CreateOrderDto) {
    const { data } = await api.post<OrderDetail>('/orders', dto);
    return data;
  },

  async update(id: string, dto: UpdateOrderDto) {
    const { data } = await api.patch(`/orders/${id}`, dto);
    return data;
  },

  async remove(id: string) {
    const { data } = await api.delete(`/orders/${id}`);
    return data;
  },

  async calculatePrice(id: string) {
    const { data } = await api.post(`/orders/${id}/calculate-price`);
    return data;
  },

  async approve(id: string) {
    const { data } = await api.post(`/orders/${id}/approve`);
    return data;
  },

  async startProduction(id: string) {
    const { data } = await api.post(`/orders/${id}/start-production`);
    return data;
  },

  async markReady(id: string) {
    const { data } = await api.post(`/orders/${id}/mark-ready`);
    return data;
  },

  async deliver(id: string) {
    const { data } = await api.post(`/orders/${id}/deliver`);
    return data;
  },

  async profitability(id: string) {
    const { data } = await api.get(`/orders/${id}/profitability`);
    return data;
  }
};

