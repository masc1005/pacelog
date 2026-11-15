import type { ProgressMetric } from '@pacelog/shared';
import type { ISessionDocument } from '../../sessions/session.model.js';
import { calculateSportMetricBaseline } from './calculate-baseline.js';
import { compareMetric } from './compare-metric.js';

function formatSwimPaceStr(secondsPer100m: number): string {
  const m = Math.floor(secondsPer100m / 60);
  const s = Math.floor(secondsPer100m % 60);
  return `${m}:${s.toString().padStart(2, '0')}/100m`;
}

export function compareSwimming(
  currentSessions: ISessionDocument[],
  baselineSessions: ISessionDocument[]
): {
  primaryMetric: ProgressMetric | null;
  secondaryMetrics: ProgressMetric[];
  evidence: string[];
} {
  const evidence: string[] = [];
  const secondaryMetrics: ProgressMetric[] = [];

  // Primary: Pace por 100m (ou distância total como fallback)
  const extractPace = (s: ISessionDocument) => {
    const m = s.metrics as any;
    if (m?.paceSecondsPer100m && m.paceSecondsPer100m > 0) return Number(m.paceSecondsPer100m);
    const dist = Number(m?.totalDistanceMeters || m?.distanceMeters || 0);
    if (dist > 0 && s.durationSeconds > 0) {
      return Math.round(s.durationSeconds / (dist / 100));
    }
    return null;
  };

  const currentPace =
    calculateSportMetricBaseline(currentSessions, extractPace) ??
    (currentSessions[0] ? extractPace(currentSessions[0]) : null);
  const baselinePace = calculateSportMetricBaseline(baselineSessions, extractPace);

  let primaryMetric: ProgressMetric | null = null;

  if (currentPace && baselinePace) {
    primaryMetric = compareMetric(
      'paceSecondsPer100m',
      'Pace médio',
      's/100m',
      'lower_is_better',
      currentPace,
      baselinePace
    );

    if (primaryMetric.status === 'improved') {
      evidence.push(`Seu pace médio na piscina caiu de ${formatSwimPaceStr(baselinePace)} para ${formatSwimPaceStr(currentPace)}.`);
    } else if (primaryMetric.status === 'declined') {
      evidence.push(`Seu pace médio na piscina subiu de ${formatSwimPaceStr(baselinePace)} para ${formatSwimPaceStr(currentPace)}.`);
    }
  }

  // Secondary (or fallback primary): Total Distance (m)
  const extractDistance = (s: ISessionDocument) => {
    const m = s.metrics as any;
    const dist = Number(m?.totalDistanceMeters || m?.distanceMeters || 0);
    return dist > 0 ? dist : null;
  };

  const currentDist =
    calculateSportMetricBaseline(currentSessions, extractDistance) ??
    (currentSessions[0] ? extractDistance(currentSessions[0]) : null);
  const baselineDist = calculateSportMetricBaseline(baselineSessions, extractDistance);

  if (currentDist && baselineDist) {
    const distMetric = compareMetric(
      'totalDistanceMeters',
      'Distância média',
      'm',
      'higher_is_better',
      currentDist,
      baselineDist
    );

    if (!primaryMetric) {
      primaryMetric = distMetric;
    } else {
      secondaryMetrics.push(distMetric);
    }

    if (distMetric.status === 'improved' && distMetric.relativeChangePercent > 10) {
      evidence.push(`Sua distância média por treino aumentou de ${Math.round(baselineDist)}m para ${Math.round(currentDist)}m.`);
    }
  }

  // Secondary: SWOLF
  const extractSwolf = (s: ISessionDocument) => {
    const m = s.metrics as any;
    return m?.swolf && m.swolf > 0 ? Number(m.swolf) : null;
  };
  const currentSwolf = calculateSportMetricBaseline(currentSessions, extractSwolf);
  const baselineSwolf = calculateSportMetricBaseline(baselineSessions, extractSwolf);

  if (currentSwolf && baselineSwolf) {
    const swolfMetric = compareMetric('swolf', 'SWOLF médio', 'pts', 'lower_is_better', currentSwolf, baselineSwolf);
    secondaryMetrics.push(swolfMetric);
  }

  return { primaryMetric, secondaryMetrics, evidence };
}
