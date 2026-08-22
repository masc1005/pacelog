import type { ProgressMetric } from '@pacelog/shared';
import type { ISessionDocument } from '../../sessions/session.model.js';
import { calculateSportMetricBaseline } from './calculate-baseline.js';
import { compareMetric } from './compare-metric.js';

export function compareFutevolei(
  currentSessions: ISessionDocument[],
  baselineSessions: ISessionDocument[]
): {
  primaryMetric: ProgressMetric | null;
  secondaryMetrics: ProgressMetric[];
  evidence: string[];
} {
  const evidence: string[] = [];
  const secondaryMetrics: ProgressMetric[] = [];

  // Primary: technicalAverage
  const extractTechnical = (s: ISessionDocument) => (s.metrics as any)?.technicalAverage ?? null;
  const currentTechnical = calculateSportMetricBaseline(currentSessions, extractTechnical) ?? (currentSessions[0] ? extractTechnical(currentSessions[0]) : null);
  const baselineTechnical = calculateSportMetricBaseline(baselineSessions, extractTechnical);

  let primaryMetric: ProgressMetric | null = null;

  if (currentTechnical && baselineTechnical) {
    primaryMetric = compareMetric('technicalAverage', 'Média técnica', '/5', 'higher_is_better', currentTechnical, baselineTechnical);
    
    if (primaryMetric.status === 'improved') {
      evidence.push(`Sua média técnica subiu de ${baselineTechnical} para ${currentTechnical}/5.`);
    } else if (primaryMetric.status === 'declined') {
      evidence.push(`Sua média técnica caiu de ${baselineTechnical} para ${currentTechnical}/5.`);
    }
  }

  // Secondary: setsWonRate
  const extractSetsWon = (s: ISessionDocument) => (s.metrics as any)?.setsWonRate ?? null;
  const currentSetsWon = calculateSportMetricBaseline(currentSessions, extractSetsWon) ?? (currentSessions[0] ? extractSetsWon(currentSessions[0]) : null);
  const baselineSetsWon = calculateSportMetricBaseline(baselineSessions, extractSetsWon);

  if (currentSetsWon && baselineSetsWon) {
    const setsWonMetric = compareMetric('setsWonRate', 'Taxa de sets vencidos', '%', 'higher_is_better', currentSetsWon, baselineSetsWon);
    secondaryMetrics.push(setsWonMetric);

    if (setsWonMetric.status === 'improved') {
      evidence.push(`Seu aproveitamento de vitórias subiu de ${baselineSetsWon}% para ${currentSetsWon}%.`);
    }
  }

  return { primaryMetric, secondaryMetrics, evidence };
}
