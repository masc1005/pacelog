import { api } from '../../lib/api';
import type { Exercise, StrengthSession, StrengthSessionCreateInput, StrengthSessionUpdateInput } from '../types/strength';

export async function getExercises(params?: {
  search?: string;
  category?: string;
  limit?: number;
  offset?: number;
}): Promise<Exercise[]> {
  const queryParams = new URLSearchParams({
    limit: String(params?.limit ?? 100),
    offset: String(params?.offset ?? 0),
  });

  if (params?.search) queryParams.set('search', params.search);
  if (params?.category) queryParams.set('category', params.category);

  const response = await api.get(`/strength/exercises?${queryParams}`);
  return response.json();
}

export async function getActiveSession(): Promise<StrengthSession | null> {
  try {
    const response = await api.get('/strength/sessions/active');
    return response.json();
  } catch (error) {
    if (error instanceof Error && error.message.includes('404')) {
      return null;
    }
    throw error;
  }
}

export async function createSession(data: StrengthSessionCreateInput): Promise<StrengthSession> {
  const response = await api.post('/strength/sessions', {
    json: data,
  });
  return response.json();
}

export async function updateSession(
  id: string,
  data: StrengthSessionUpdateInput,
): Promise<StrengthSession> {
  const response = await api.patch(`/strength/sessions/${id}`, {
    json: data,
  });
  return response.json();
}

export async function completeSession(id: string): Promise<StrengthSession> {
  const response = await api.post(`/strength/sessions/${id}/complete`);
  return response.json();
}

export async function getSessionHistory(params?: {
  limit?: number;
  offset?: number;
}): Promise<StrengthSession[]> {
  const queryParams = new URLSearchParams({
    limit: String(params?.limit ?? 50),
    offset: String(params?.offset ?? 0),
  });

  const response = await api.get(`/strength/sessions/history?${queryParams}`);
  return response.json();
}
