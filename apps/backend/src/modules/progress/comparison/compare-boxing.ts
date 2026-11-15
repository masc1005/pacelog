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

  // Primary: roundsCount
  const extractRounds = (s: ISessionDocument) => {
    const m = s.metrics as any;
    return m?.roundsCount && m.roundsCount > 0 ? Number(m.roundsCount) : null;
  };
  const currentRounds = calculateSportMetricBaseline(currentSessions, extractRounds) ?? (currentSessions[0] ? extractRounds(currentSessions[0]) : null);
  const baselineRounds = calculateSportMetricBaseline(baselineSessions, extractRounds);

  let primaryMetric: ProgressMetric | null = null;

  if (currentRounds && baselineRounds) {
    primaryMetric = compareMetric('roundsCount', 'Rounds concluídos', 'rounds', 'higher_is_better', currentRounds, baselineRounds);
    
    if (primaryMetric.status === 'improved') {
      evidence.push(`Você aumentou sua média de ${baselineRounds} para ${currentRounds} rounds por sessão.`);
    } else if (primaryMetric.status === 'declined') {
      evidence.push(`Sua média de rounds reduziu de ${baselineRounds} para ${currentRounds} por sessão.`);
    }
  }

  // Secondary: punchesThrownEstimate
  const extractPunches = (s: ISessionDocument) => {
    const m = s.metrics as any;
    return m?.punchesThrownEstimate && m.punchesThrownEstimate > 0 ? Number(m.punchesThrownEstimate) : null;
  };
  const currentPunches = calculateSportMetricBaseline(currentSessions, extractPunches) ?? (currentSessions[0] ? extractPunches(currentSessions[0]) : null);
  const baselinePunches = calculateSportMetricBaseline(baselineSessions, extractPunches);

  if (currentPunches && baselinePunches) {
    const punchesMetric = compareMetric('punchesThrownEstimate', 'Volume de golpes', 'golpes', 'higher_is_better', currentPunches, baselinePunches);
    secondaryMetrics.push(punchesMetric);

    if (punchesMetric.status === 'improved') {
      evidence.push(`Seu volume estimado de golpes subiu de ${Math.round(baselinePunches)} para ${Math.round(currentPunches)} por treino.`);
    }
  }

  return { primaryMetric, secondaryMetrics, evidence };
}
