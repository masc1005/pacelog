import { apiClient } from '../lib/api';
import type {
  CreateInjuryInput,
  UpdateInjuryInput,
  InjuryDTO,
  InjuryStatus,
} from '@pacelog/shared';

export const injuryApi = {
  list(status?: InjuryStatus): Promise<InjuryDTO[]> {
    return apiClient<InjuryDTO[]>('/api/injuries', {
      params: status ? { status } : undefined,
    });
  },
  create(payload: CreateInjuryInput): Promise<InjuryDTO> {
    return apiClient<InjuryDTO>('/api/injuries', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  update(id: string, payload: UpdateInjuryInput): Promise<InjuryDTO> {
    return apiClient<InjuryDTO>(`/api/injuries/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },
  remove(id: string): Promise<void> {
    return apiClient<void>(`/api/injuries/${id}`, { method: 'DELETE' });
  },
};
