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

  // Primary: Minutes Played (supports explicit minutesPlayed or session/metrics durationSeconds)
  const extractMinutes = (s: ISessionDocument) => {
    const m = s.metrics as any;
    if (m?.minutesPlayed && m.minutesPlayed > 0) return Number(m.minutesPlayed);
    const durSec = Number(s.durationSeconds || m?.durationSeconds || 0);
    return durSec > 0 ? Math.round(durSec / 60) : null;
  };
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
  const extractGoals = (s: ISessionDocument) => {
    const g = (s.metrics as any)?.goals;
    return g !== undefined && g !== null ? Number(g) : null;
  };
  const currentGoals = calculateSportMetricBaseline(currentSessions, extractGoals) ?? (currentSessions[0] ? extractGoals(currentSessions[0]) : null);
  const baselineGoals = calculateSportMetricBaseline(baselineSessions, extractGoals);

  if (currentGoals !== null && baselineGoals !== null && (currentGoals > 0 || baselineGoals > 0)) {
    const goalsMetric = compareMetric('goals', 'Gols', 'gols', 'higher_is_better', currentGoals, baselineGoals);
    secondaryMetrics.push(goalsMetric);

    if (goalsMetric.status === 'improved') {
      evidence.push(`Sua média de gols por partida aumentou de ${baselineGoals} para ${currentGoals}.`);
    }
  }

  return { primaryMetric, secondaryMetrics, evidence };
}
