import { apiClient } from '../lib/api';
import type {
  DailyReadinessDTO,
  DailyReadinessOverviewDTO,
  UpsertDailyReadinessInput,
} from '@pacelog/shared';

export const readinessApi = {
  async getOverview(dateKey?: string): Promise<DailyReadinessOverviewDTO> {
    const query = dateKey ? `?dateKey=${encodeURIComponent(dateKey)}` : '';
    return apiClient<DailyReadinessOverviewDTO>(`/api/readiness${query}`);
  },

  async saveReadiness(
    payload: UpsertDailyReadinessInput
  ): Promise<DailyReadinessDTO> {
    return apiClient<DailyReadinessDTO>('/api/readiness', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
};
