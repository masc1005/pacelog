import { apiClient } from '../lib/api';
import type { RunningShoe, CreateShoeDTO, UpdateShoeDTO } from '@pacelog/shared';

export const shoeApi = {
  getShoes: async (includeArchived = false) => {
    return apiClient<RunningShoe[]>('/api/shoes', { params: { includeArchived } });
  },
  getShoeById: async (id: string) => {
    return apiClient<RunningShoe>(`/api/shoes/${id}`);
  },
  createShoe: async (data: CreateShoeDTO) => {
    return apiClient<RunningShoe>('/api/shoes', { method: 'POST', body: JSON.stringify(data) });
  },
  updateShoe: async (id: string, data: UpdateShoeDTO) => {
    return apiClient<RunningShoe>(`/api/shoes/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
  },
  setDefault: async (id: string) => {
    return apiClient<RunningShoe>(`/api/shoes/${id}/set-default`, { method: 'POST' });
  },
  retireShoe: async (id: string) => {
    return apiClient<RunningShoe>(`/api/shoes/${id}/retire`, { method: 'POST' });
  },
  archiveShoe: async (id: string) => {
    return apiClient<RunningShoe>(`/api/shoes/${id}/archive`, { method: 'POST' });
  }
};
