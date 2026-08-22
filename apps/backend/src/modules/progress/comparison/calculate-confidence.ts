import type { ConfidenceLevel } from '@pacelog/shared';

export function calculateConfidence(
  sessionsCount: number,
  daysOfHistory: number
): ConfidenceLevel {
  if (sessionsCount < 3 || daysOfHistory < 14) return 'low';
  if (sessionsCount >= 8 && daysOfHistory >= 28) return 'high';
  return 'medium';
}
