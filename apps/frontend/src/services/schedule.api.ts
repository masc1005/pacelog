import { apiClient } from '../lib/api';
import type {
  WeeklyScheduleDTO,
  UpdateWeeklyScheduleDayInput,
  UpdateWeeklyScheduleInput,
} from '@pacelog/shared';

const BASE = '/api/schedule';

export const scheduleApi = {
  getSchedule: () => apiClient<WeeklyScheduleDTO>(BASE),

  updateDay: (input: UpdateWeeklyScheduleDayInput) =>
    apiClient<WeeklyScheduleDTO>(`${BASE}/day`, {
      method: 'PUT',
      body: JSON.stringify(input),
    }),

  updateSchedule: (input: UpdateWeeklyScheduleInput) =>
    apiClient<WeeklyScheduleDTO>(BASE, {
      method: 'PUT',
      body: JSON.stringify(input),
    }),
};
