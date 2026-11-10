import { apiClient } from '../lib/api';
import type {
  Gear,
  CreateGearDTO,
  UpdateGearDTO,
  GearComponentInput,
  GearCategory,
} from '@pacelog/shared';

export const gearApi = {
  getGear: async (includeArchived = false, category?: GearCategory) => {
    return apiClient<Gear[]>('/api/gear', {
      params: {
        includeArchived,
        ...(category ? { category } : {}),
      },
    });
  },
  getGearById: async (id: string) => {
    return apiClient<Gear>(`/api/gear/${id}`);
  },
  createGear: async (data: CreateGearDTO) => {
    return apiClient<Gear>('/api/gear', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  updateGear: async (id: string, data: UpdateGearDTO) => {
    return apiClient<Gear>(`/api/gear/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },
  setDefault: async (id: string) => {
    return apiClient<Gear>(`/api/gear/${id}/set-default`, { method: 'POST' });
  },
  retireGear: async (id: string) => {
    return apiClient<Gear>(`/api/gear/${id}/retire`, { method: 'POST' });
  },
  archiveGear: async (id: string) => {
    return apiClient<Gear>(`/api/gear/${id}/archive`, { method: 'POST' });
  },
  addComponent: async (gearId: string, data: GearComponentInput) => {
    return apiClient<Gear>(`/api/gear/${gearId}/components`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  replaceComponent: async (gearId: string, componentId: string) => {
    return apiClient<Gear>(`/api/gear/${gearId}/components/${componentId}/replace`, {
      method: 'POST',
    });
  },
  removeComponent: async (gearId: string, componentId: string) => {
    return apiClient<Gear>(`/api/gear/${gearId}/components/${componentId}`, {
      method: 'DELETE',
    });
  },
};

/** Alias legado para compatibilidade */
export const shoeApi = gearApi;
