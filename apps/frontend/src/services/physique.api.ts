import { apiClient, PHYSIQUE_API_TIMEOUT_MS } from '../lib/api';
import type {
  CreatePhysiqueAssessmentInput,
  GeneratePhysiquePlanInput,
  PhysiqueAssessmentDTO,
  StrengthRoutineDTO,
} from '@pacelog/shared';

export const physiqueApi = {
  assess: (input: CreatePhysiqueAssessmentInput) =>
    apiClient<PhysiqueAssessmentDTO>('/api/physique/assess', {
      method: 'POST',
      body: JSON.stringify(input),
      timeoutMs: PHYSIQUE_API_TIMEOUT_MS,
    }),

  list: () => apiClient<PhysiqueAssessmentDTO[]>('/api/physique'),

  getById: (id: string) =>
    apiClient<PhysiqueAssessmentDTO>(`/api/physique/${id}`),

  generatePlan: (id: string, input: GeneratePhysiquePlanInput = {}) =>
    apiClient<{ summary: string; routines: StrengthRoutineDTO[] }>(
      `/api/physique/${id}/generate-plan`,
      {
        method: 'POST',
        body: JSON.stringify(input),
        timeoutMs: PHYSIQUE_API_TIMEOUT_MS,
      }
    ),
};
