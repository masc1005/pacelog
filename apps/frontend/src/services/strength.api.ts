import { apiClient } from '../lib/api';
import type {
  ActiveStrengthSession,
  CompletedStrengthSession,
  StartStrengthSessionInput,
  AddExerciseInput,
  AddSetInput,
  CompleteSetInput,
  EditSetInput,
  FinishSessionInput,
  PatchSessionInput,
  ExerciseListResult,
  ExerciseSearchParams,
  CreateCustomExerciseInput,
  Exercise,
  AIInsightDTO,
} from '@pacelog/shared';

const BASE = '/api/strength';

// ==========================================
// SESSÕES
// ==========================================

export const strengthApi = {
  startSession: (input: StartStrengthSessionInput) =>
    apiClient<ActiveStrengthSession>(`${BASE}/sessions`, {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  getActiveSession: () =>
    apiClient<ActiveStrengthSession | null>(`${BASE}/sessions/active`),

  getSessionById: (id: string) =>
    apiClient<ActiveStrengthSession | CompletedStrengthSession>(
      `${BASE}/sessions/${id}`
    ),

  listSessions: (page = 1, limit = 20) =>
    apiClient<CompletedStrengthSession[]>(`${BASE}/sessions`, {
      params: { page, limit },
    }),

  patchSession: (id: string, input: PatchSessionInput) =>
    apiClient<ActiveStrengthSession | CompletedStrengthSession>(`${BASE}/sessions/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    }),

  pauseSession: (id: string) =>
    apiClient<ActiveStrengthSession>(`${BASE}/sessions/${id}/pause`, {
      method: 'POST',
    }),

  resumeSession: (id: string) =>
    apiClient<ActiveStrengthSession>(`${BASE}/sessions/${id}/resume`, {
      method: 'POST',
    }),

  finishSession: (id: string, input: FinishSessionInput) =>
    apiClient<CompletedStrengthSession>(`${BASE}/sessions/${id}/finish`, {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  cancelSession: (id: string) =>
    apiClient<ActiveStrengthSession>(`${BASE}/sessions/${id}/cancel`, {
      method: 'POST',
    }),

  addExercise: (id: string, input: AddExerciseInput) =>
    apiClient<ActiveStrengthSession>(`${BASE}/sessions/${id}/exercises`, {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  removeExercise: (id: string, exerciseId: string) =>
    apiClient<ActiveStrengthSession>(
      `${BASE}/sessions/${id}/exercises/${exerciseId}`,
      { method: 'DELETE' }
    ),

  addSet: (id: string, input: AddSetInput) =>
    apiClient<ActiveStrengthSession>(`${BASE}/sessions/${id}/sets`, {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  completeSet: (id: string, input: CompleteSetInput) =>
    apiClient<ActiveStrengthSession>(`${BASE}/sessions/${id}/sets/complete`, {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  editSet: (
    id: string,
    exerciseId: string,
    setId: string,
    input: EditSetInput
  ) =>
    apiClient<ActiveStrengthSession>(
      `${BASE}/sessions/${id}/exercises/${exerciseId}/sets/${setId}`,
      { method: 'PATCH', body: JSON.stringify(input) }
    ),

  removeSet: (id: string, exerciseId: string, setId: string) =>
    apiClient<ActiveStrengthSession>(
      `${BASE}/sessions/${id}/exercises/${exerciseId}/sets/${setId}`,
      { method: 'DELETE' }
    ),

  // ==========================================
  // BIBLIOTECA DE EXERCÍCIOS
  // ==========================================

  searchExercises: (params: ExerciseSearchParams) =>
    apiClient<ExerciseListResult>(`${BASE}/exercises`, {
      params: params as Record<string, any>,
    }),

  getExerciseByKey: (key: string) =>
    apiClient<Exercise>(`${BASE}/exercises/${encodeURIComponent(key)}`),

  createCustomExercise: (input: CreateCustomExerciseInput) =>
    apiClient<Exercise>(`${BASE}/exercises/custom`, {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  // ==========================================
  // INSIGHTS DE IA
  // ==========================================

  /** Retorna insight já gerado para a sessão, ou null (404) se ainda não existe. */
  getInsight: (sessionId: string) =>
    apiClient<AIInsightDTO>(`${BASE}/sessions/${sessionId}/insight`),

  /** Gera (ou regenera com force=true) o insight de uma sessão finalizada. */
  generateInsight: (sessionId: string, force = false) =>
    apiClient<AIInsightDTO>(
      `${BASE}/sessions/${sessionId}/insight/generate${force ? '?force=true' : ''}`,
      { method: 'POST' }
    ),
};