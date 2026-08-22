import type { ProgressMetric } from '@pacelog/shared';
import type { ISessionDocument } from '../../sessions/session.model.js';
import { calculateSportMetricBaseline } from './calculate-baseline.js';
import { compareMetric } from './compare-metric.js';

export function compareFootball(
  currentSessions: ISessionDocument[],
  baselineSessions: ISessionDocument[]
): {
  primaryMetric: ProgressMetric | null;
  secondaryMetrics: ProgressMetric[];
  evidence: string[];
} {
  const evidence: string[] = [];
  const secondaryMetrics: ProgressMetric[] = [];

  // Primary: Minutes Played
  const extractMinutes = (s: ISessionDocument) => (s.metrics as any)?.minutesPlayed ?? null;
  const currentMinutes = calculateSportMetricBaseline(currentSessions, extractMinutes) ?? (currentSessions[0] ? extractMinutes(currentSessions[0]) : null);
  const baselineMinutes = calculateSportMetricBaseline(baselineSessions, extractMinutes);

  let primaryMetric: ProgressMetric | null = null;

  if (currentMinutes && baselineMinutes) {
    primaryMetric = compareMetric('minutesPlayed', 'Minutos jogados', 'min', 'higher_is_better', currentMinutes, baselineMinutes);
    
    if (primaryMetric.status === 'improved') {
      evidence.push(`Sua média de tempo em campo subiu de ${baselineMinutes} para ${currentMinutes} minutos por jogo.`);
    } else if (primaryMetric.status === 'declined') {
      evidence.push(`Sua média de tempo em campo caiu de ${baselineMinutes} para ${currentMinutes} minutos por jogo.`);
    }
  }

  // Secondary: Goals
  const extractGoals = (s: ISessionDocument) => (s.metrics as any)?.goals ?? null;
  const currentGoals = calculateSportMetricBaseline(currentSessions, extractGoals) ?? (currentSessions[0] ? extractGoals(currentSessions[0]) : null);
  const baselineGoals = calculateSportMetricBaseline(baselineSessions, extractGoals);

  if (currentGoals && baselineGoals) {
    const goalsMetric = compareMetric('goals', 'Gols', 'gols', 'higher_is_better', currentGoals, baselineGoals);
    secondaryMetrics.push(goalsMetric);

    if (goalsMetric.status === 'improved') {
      evidence.push(`Sua média de gols por partida aumentou de ${baselineGoals} para ${currentGoals}.`);
    }
  }

  return { primaryMetric, secondaryMetrics, evidence };
}
