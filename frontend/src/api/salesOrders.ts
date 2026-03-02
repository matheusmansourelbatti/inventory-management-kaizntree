import apiClient from './client';
import type { SalesOrder, PaginatedResponse } from '../types';

export const salesOrdersApi = {
  list: async (status?: string): Promise<PaginatedResponse<SalesOrder>> => {
    const params: Record<string, string> = { page_size: '100' };
    if (status) params.status = status;
    const { data } = await apiClient.get('/sales-orders/', { params });
    return data;
  },

  get: async (id: string): Promise<SalesOrder> => {
    const { data } = await apiClient.get(`/sales-orders/${id}/`);
    return data;
  },

  create: async (order: Partial<SalesOrder>): Promise<SalesOrder> => {
    const { data } = await apiClient.post('/sales-orders/', order);
    return data;
  },

  update: async (id: string, order: Partial<SalesOrder>): Promise<SalesOrder> => {
    const { data } = await apiClient.put(`/sales-orders/${id}/`, order);
    return data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/sales-orders/${id}/`);
  },
};
