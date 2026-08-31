import type { ProgressMetric } from '@pacelog/shared';
import type { ISessionDocument } from '../../sessions/session.model.js';
import { calculateSportMetricBaseline } from './calculate-baseline.js';
import { compareMetric } from './compare-metric.js';

export function compareJiuJitsu(
  currentSessions: ISessionDocument[],
  baselineSessions: ISessionDocument[]
): {
  primaryMetric: ProgressMetric | null;
  secondaryMetrics: ProgressMetric[];
  evidence: string[];
} {
  const evidence: string[] = [];
  const secondaryMetrics: ProgressMetric[] = [];

  // Filtra sessões com rolas (sparring/competition) ou técnicas
  const extractRounds = (s: ISessionDocument) => {
    const m = s.metrics as any;
    if (m?.roundsCount != null && m.roundsCount > 0) return m.roundsCount;
    return null;
  };

  const currentRounds = calculateSportMetricBaseline(currentSessions, extractRounds) ?? (currentSessions[0] ? extractRounds(currentSessions[0]) : null);
  const baselineRounds = calculateSportMetricBaseline(baselineSessions, extractRounds);

  let primaryMetric: ProgressMetric | null = null;

  if (currentRounds != null && baselineRounds != null) {
    primaryMetric = compareMetric('roundsCount', 'Rolas por sessão', 'rolas', 'higher_is_better', currentRounds, baselineRounds);

    if (primaryMetric.status === 'improved') {
      evidence.push(`Seu volume de rolas subiu de ${baselineRounds} para ${currentRounds} por sessão.`);
    } else if (primaryMetric.status === 'declined') {
      evidence.push(`Seu volume de rolas reduziu de ${baselineRounds} para ${currentRounds} por sessão.`);
    }
  }

  // Secondary: Submissões aplicadas
  const extractSubsLanded = (s: ISessionDocument) => {
    const m = s.metrics as any;
    return m?.submissionsLanded != null ? m.submissionsLanded : null;
  };
  const currentSubsLanded = calculateSportMetricBaseline(currentSessions, extractSubsLanded);
  const baselineSubsLanded = calculateSportMetricBaseline(baselineSessions, extractSubsLanded);

  if (currentSubsLanded != null && baselineSubsLanded != null) {
    const subsMetric = compareMetric('submissionsLanded', 'Finalizações aplicadas', 'submissões', 'higher_is_better', currentSubsLanded, baselineSubsLanded);
    secondaryMetrics.push(subsMetric);
  }

  // Secondary: Duração média da sessão
  const extractDurationMin = (s: ISessionDocument) => (s.durationSeconds > 0 ? Math.round(s.durationSeconds / 60) : null);
  const currentDur = calculateSportMetricBaseline(currentSessions, extractDurationMin) ?? (currentSessions[0] ? extractDurationMin(currentSessions[0]) : null);
  const baselineDur = calculateSportMetricBaseline(baselineSessions, extractDurationMin);

  if (currentDur != null && baselineDur != null) {
    const durMetric = compareMetric('durationMinutes', 'Tempo médio no tatame', 'min', 'higher_is_better', currentDur, baselineDur);
    secondaryMetrics.push(durMetric);
  }

  return { primaryMetric, secondaryMetrics, evidence };
}
