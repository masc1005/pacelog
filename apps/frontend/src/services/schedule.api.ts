import { apiClient } from '../lib/api';
import type {
  WeeklyScheduleDTO,
  UpdateWeeklyScheduleDayInput,
  UpdateWeeklyScheduleInput,
  GenerateAIScheduleInput,
  GeneratedWeeklyScheduleDTO,
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

  activateDeload: () =>
    apiClient<WeeklyScheduleDTO>(`${BASE}/deload`, {
      method: 'POST',
    }),

  generateWithAI: (input: GenerateAIScheduleInput) =>
    apiClient<GeneratedWeeklyScheduleDTO>(`${BASE}/ai-generate`, {
      method: 'POST',
      body: JSON.stringify(input),
    }),
};
