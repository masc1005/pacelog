import type { ProgressMetric } from '@pacelog/shared';
import type { ISessionDocument } from '../../sessions/session.model.js';
import { calculateSportMetricBaseline } from './calculate-baseline.js';
import { compareMetric } from './compare-metric.js';

export function compareBoxing(
  currentSessions: ISessionDocument[],
  baselineSessions: ISessionDocument[]
): {
  primaryMetric: ProgressMetric | null;
  secondaryMetrics: ProgressMetric[];
  evidence: string[];
} {
  const evidence: string[] = [];
  const secondaryMetrics: ProgressMetric[] = [];

  // Primary: roundCompletionRate
  const extractCompletion = (s: ISessionDocument) => (s.metrics as any)?.roundCompletionRate ?? null;
  const currentCompletion = calculateSportMetricBaseline(currentSessions, extractCompletion) ?? (currentSessions[0] ? extractCompletion(currentSessions[0]) : null);
  const baselineCompletion = calculateSportMetricBaseline(baselineSessions, extractCompletion);

  let primaryMetric: ProgressMetric | null = null;

  if (currentCompletion && baselineCompletion) {
    primaryMetric = compareMetric('roundCompletionRate', 'Conclusão de rounds', '%', 'higher_is_better', currentCompletion, baselineCompletion);
    
    if (primaryMetric.status === 'improved') {
      evidence.push(`Sua taxa de conclusão de rounds subiu de ${baselineCompletion}% para ${currentCompletion}%.`);
    } else if (primaryMetric.status === 'declined') {
      evidence.push(`Sua taxa de conclusão de rounds caiu de ${baselineCompletion}% para ${currentCompletion}%.`);
    }
  }

  // Secondary: roundsCount (from root or metrics)
  const extractRounds = (s: ISessionDocument) => (s.metrics as any)?.roundsCount ?? null;
  const currentRounds = calculateSportMetricBaseline(currentSessions, extractRounds) ?? (currentSessions[0] ? extractRounds(currentSessions[0]) : null);
  const baselineRounds = calculateSportMetricBaseline(baselineSessions, extractRounds);

  if (currentRounds && baselineRounds) {
    const roundsMetric = compareMetric('roundsCount', 'Rounds concluídos', 'rounds', 'neutral', currentRounds, baselineRounds);
    secondaryMetrics.push(roundsMetric);

    if (roundsMetric.status === 'changed') {
      evidence.push(`Você passou de ${baselineRounds} para ${currentRounds} rounds concluídos por sessão.`);
    }
  }

  return { primaryMetric, secondaryMetrics, evidence };
}
