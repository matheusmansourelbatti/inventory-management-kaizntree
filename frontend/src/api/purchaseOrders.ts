import apiClient from './client';
import type { PurchaseOrder, PaginatedResponse } from '../types';

export const purchaseOrdersApi = {
  list: async (status?: string): Promise<PaginatedResponse<PurchaseOrder>> => {
    const params: Record<string, string> = { page_size: '100' };
    if (status) params.status = status;
    const { data } = await apiClient.get('/purchase-orders/', { params });
    return data;
  },

  get: async (id: string): Promise<PurchaseOrder> => {
    const { data } = await apiClient.get(`/purchase-orders/${id}/`);
    return data;
  },

  create: async (order: Partial<PurchaseOrder>): Promise<PurchaseOrder> => {
    const { data } = await apiClient.post('/purchase-orders/', order);
    return data;
  },

  update: async (id: string, order: Partial<PurchaseOrder>): Promise<PurchaseOrder> => {
    const { data } = await apiClient.put(`/purchase-orders/${id}/`, order);
    return data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/purchase-orders/${id}/`);
  },
};
