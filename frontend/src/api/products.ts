import apiClient from './client';
import type { Product, ProductListItem, PaginatedResponse, Stock } from '../types';

export const productsApi = {
  list: async (search?: string): Promise<PaginatedResponse<ProductListItem>> => {
    const params: Record<string, string> = { page_size: '100' };
    if (search) params.search = search;
    const { data } = await apiClient.get('/products/', { params });
    return data;
  },

  get: async (id: string): Promise<Product> => {
    const { data } = await apiClient.get(`/products/${id}/`);
    return data;
  },

  create: async (product: Partial<Product>): Promise<Product> => {
    const { data } = await apiClient.post('/products/', product);
    return data;
  },

  update: async (id: string, product: Partial<Product>): Promise<Product> => {
    const { data } = await apiClient.patch(`/products/${id}/`, product);
    return data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/products/${id}/`);
  },

  addStock: async (productId: string, quantity: string, note?: string): Promise<Stock> => {
    const { data } = await apiClient.post('/stocks/', {
      product: productId, quantity, note: note || '',
    });
    return data;
  },

  getStocks: async (productId: string): Promise<PaginatedResponse<Stock>> => {
    const { data } = await apiClient.get('/stocks/', {
      params: { product: productId, page_size: '100' },
    });
    return data;
  },
};
