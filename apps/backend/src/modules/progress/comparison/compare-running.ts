import type { ProgressMetric } from '@pacelog/shared';
import type { ISessionDocument } from '../../sessions/session.model.js';
import { calculateSportMetricBaseline } from './calculate-baseline.js';
import { compareMetric } from './compare-metric.js';
// Simple pace formatter for backend evidence strings
function formatPaceStr(secondsPerKm: number): string {
  const m = Math.floor(secondsPerKm / 60);
  const s = Math.floor(secondsPerKm % 60);
  return `${m}:${s.toString().padStart(2, '0')}/km`;
}

export function compareRunning(
  currentSessions: ISessionDocument[],
  baselineSessions: ISessionDocument[]
): {
  primaryMetric: ProgressMetric | null;
  secondaryMetrics: ProgressMetric[];
  evidence: string[];
} {
  const evidence: string[] = [];
  const secondaryMetrics: ProgressMetric[] = [];

  // Primary: Pace
  const extractPace = (s: ISessionDocument) => (s.metrics as any)?.paceSecondsPerKm ?? null;
  const currentPace = calculateSportMetricBaseline(currentSessions, extractPace) ?? (currentSessions[0] ? extractPace(currentSessions[0]) : null);
  const baselinePace = calculateSportMetricBaseline(baselineSessions, extractPace);

  let primaryMetric: ProgressMetric | null = null;

  if (currentPace && baselinePace) {
    primaryMetric = compareMetric('paceSecondsPerKm', 'Pace médio', 's/km', 'lower_is_better', currentPace, baselinePace);
    
    if (primaryMetric.status === 'improved') {
      evidence.push(`Seu pace médio caiu de ${formatPaceStr(baselinePace)} para ${formatPaceStr(currentPace)}.`);
    } else if (primaryMetric.status === 'declined') {
      evidence.push(`Seu pace médio subiu de ${formatPaceStr(baselinePace)} para ${formatPaceStr(currentPace)}.`);
    }
  }

  // Secondary: Distance
  const extractDistance = (s: ISessionDocument) => (s.metrics as any)?.distanceKm ?? null;
  const currentDist = calculateSportMetricBaseline(currentSessions, extractDistance) ?? (currentSessions[0] ? extractDistance(currentSessions[0]) : null);
  const baselineDist = calculateSportMetricBaseline(baselineSessions, extractDistance);

  if (currentDist && baselineDist) {
    const distMetric = compareMetric('distanceKm', 'Distância', 'km', 'higher_is_better', currentDist, baselineDist);
    secondaryMetrics.push(distMetric);

    if (distMetric.status === 'improved' && distMetric.relativeChangePercent > 10) {
      evidence.push(`Sua distância média por sessão aumentou de ${baselineDist}km para ${currentDist}km.`);
    }
  }

  return { primaryMetric, secondaryMetrics, evidence };
}
