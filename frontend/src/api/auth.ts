import apiClient from './client';
import type { AuthTokens, User } from '../types';

export const authApi = {
  login: async (username: string, password: string): Promise<AuthTokens> => {
    const { data } = await apiClient.post('/auth/login/', { username, password });
    return data;
  },

  register: async (username: string, email: string, password: string): Promise<User> => {
    const { data } = await apiClient.post('/auth/register/', {
      username, email, password, password_confirm: password,
    });
    return data;
  },

  me: async (): Promise<User> => {
    const { data } = await apiClient.get('/auth/me/');
    return data;
  },
};
