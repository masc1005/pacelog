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

  // Primary: Taxa de sets vencidos ou Sets disputados / Média técnica
  const extractSetsWonRate = (s: ISessionDocument) => {
    const m = s.metrics as any;
    if (m?.setsWonRate != null && m.setsWonRate > 0) return Number(m.setsWonRate);
    if (m?.setsCount > 0 && m?.setsWon != null) {
      return Math.round((Number(m.setsWon) / Number(m.setsCount)) * 100);
    }
    return null;
  };

  const extractSetsCount = (s: ISessionDocument) => {
    const m = s.metrics as any;
    return m?.setsCount && m.setsCount > 0 ? Number(m.setsCount) : null;
  };

  const extractTechnical = (s: ISessionDocument) => {
    const m = s.metrics as any;
    if (m?.technicalAverage && m.technicalAverage > 0) return Number(m.technicalAverage);
    const actions = [m?.successfulReceptions, m?.successfulSets, m?.successfulAttacks, m?.aces]
      .filter((v): v is number => v != null && Number(v) > 0)
      .map(Number);
    if (actions.length > 0) {
      return Math.round((actions.reduce((a, b) => a + b, 0) / actions.length) * 10) / 10;
    }
    return null;
  };

  let primaryMetric: ProgressMetric | null = null;

  const currentSetsWon = calculateSportMetricBaseline(currentSessions, extractSetsWonRate) ?? (currentSessions[0] ? extractSetsWonRate(currentSessions[0]) : null);
  const baselineSetsWon = calculateSportMetricBaseline(baselineSessions, extractSetsWonRate);

  if (currentSetsWon && baselineSetsWon) {
    primaryMetric = compareMetric('setsWonRate', 'Taxa de sets vencidos', '%', 'higher_is_better', currentSetsWon, baselineSetsWon);
    if (primaryMetric.status === 'improved') {
      evidence.push(`Seu aproveitamento de vitórias subiu de ${baselineSetsWon}% para ${currentSetsWon}%.`);
    } else if (primaryMetric.status === 'declined') {
      evidence.push(`Seu aproveitamento de vitórias caiu de ${baselineSetsWon}% para ${currentSetsWon}%.`);
    }
  }

  const currentSetsCount = calculateSportMetricBaseline(currentSessions, extractSetsCount) ?? (currentSessions[0] ? extractSetsCount(currentSessions[0]) : null);
  const baselineSetsCount = calculateSportMetricBaseline(baselineSessions, extractSetsCount);

  if (currentSetsCount && baselineSetsCount) {
    const setsMetric = compareMetric('setsCount', 'Sets por sessão', 'sets', 'higher_is_better', currentSetsCount, baselineSetsCount);
    if (!primaryMetric) {
      primaryMetric = setsMetric;
    } else {
      secondaryMetrics.push(setsMetric);
    }
    if (setsMetric.status === 'improved') {
      evidence.push(`Sua média de sets por treino subiu de ${baselineSetsCount} para ${currentSetsCount}.`);
    }
  }

  const currentTechnical = calculateSportMetricBaseline(currentSessions, extractTechnical);
  const baselineTechnical = calculateSportMetricBaseline(baselineSessions, extractTechnical);

  if (currentTechnical && baselineTechnical) {
    const techMetric = compareMetric('technicalAverage', 'Ações técnicas', 'ações', 'higher_is_better', currentTechnical, baselineTechnical);
    if (!primaryMetric) {
      primaryMetric = techMetric;
    } else {
      secondaryMetrics.push(techMetric);
    }
  }

  return { primaryMetric, secondaryMetrics, evidence };
}
