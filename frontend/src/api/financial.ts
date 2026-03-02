import apiClient from './client';
import type { FinancialSummary } from '../types';

export const financialApi = {
  getSummary: async (): Promise<FinancialSummary> => {
    const { data } = await apiClient.get('/financial/summary/');
    return data;
  },
};
