import type { ProgressMetric } from '@pacelog/shared';
import type { ISessionDocument } from '../../sessions/session.model.js';
import { calculateSportMetricBaseline } from './calculate-baseline.js';
import { compareMetric } from './compare-metric.js';

export function compareCycling(
  currentSessions: ISessionDocument[],
  baselineSessions: ISessionDocument[]
): {
  primaryMetric: ProgressMetric | null;
  secondaryMetrics: ProgressMetric[];
  evidence: string[];
} {
  const evidence: string[] = [];
  const secondaryMetrics: ProgressMetric[] = [];

  // Primary: Average Speed (km/h) - calculated from distance and duration
  const extractSpeed = (s: ISessionDocument) => {
    const m = s.metrics as any;
    if (m?.distanceKm && s.durationSeconds > 0) {
      const hours = s.durationSeconds / 3600;
      return Math.round((m.distanceKm / hours) * 10) / 10;
    }
    if (m?.averageSpeedKmh) return m.averageSpeedKmh;
    return null;
  };

  const currentSpeed = calculateSportMetricBaseline(currentSessions, extractSpeed) ?? (currentSessions[0] ? extractSpeed(currentSessions[0]) : null);
  const baselineSpeed = calculateSportMetricBaseline(baselineSessions, extractSpeed);

  let primaryMetric: ProgressMetric | null = null;

  if (currentSpeed && baselineSpeed) {
    primaryMetric = compareMetric('averageSpeedKmh', 'Velocidade média', 'km/h', 'higher_is_better', currentSpeed, baselineSpeed);

    if (primaryMetric.status === 'improved') {
      evidence.push(`Sua velocidade média subiu de ${baselineSpeed} km/h para ${currentSpeed} km/h.`);
    } else if (primaryMetric.status === 'declined') {
      evidence.push(`Sua velocidade média caiu de ${baselineSpeed} km/h para ${currentSpeed} km/h.`);
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
      evidence.push(`Sua distância média por pedal aumentou de ${baselineDist} km para ${currentDist} km.`);
    }
  }

  // Secondary: Elevation Gain (if available)
  const extractElevation = (s: ISessionDocument) => (s.metrics as any)?.elevationGainMeters ?? null;
  const currentElev = calculateSportMetricBaseline(currentSessions, extractElevation);
  const baselineElev = calculateSportMetricBaseline(baselineSessions, extractElevation);

  if (currentElev && baselineElev) {
    const elevMetric = compareMetric('elevationGainMeters', 'Ganho de elevação', 'm', 'higher_is_better', currentElev, baselineElev);
    secondaryMetrics.push(elevMetric);
  }

  return { primaryMetric, secondaryMetrics, evidence };
}
