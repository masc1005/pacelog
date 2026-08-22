import type { ProgressMetric } from '@pacelog/shared';
import type { ISessionDocument } from '../../sessions/session.model.js';
import { calculateSportMetricBaseline } from './calculate-baseline.js';
import { compareMetric } from './compare-metric.js';

export function compareStrength(
  currentSessions: ISessionDocument[],
  baselineSessions: ISessionDocument[]
): {
  primaryMetric: ProgressMetric | null;
  secondaryMetrics: ProgressMetric[];
  evidence: string[];
} {
  const evidence: string[] = [];
  const secondaryMetrics: ProgressMetric[] = [];

  // Primary: Volume
  const extractVolume = (s: ISessionDocument) => (s.metrics as any)?.totalVolumeKg ?? null;
  const currentVolume = calculateSportMetricBaseline(currentSessions, extractVolume) ?? (currentSessions[0] ? extractVolume(currentSessions[0]) : null);
  const baselineVolume = calculateSportMetricBaseline(baselineSessions, extractVolume);

  let primaryMetric: ProgressMetric | null = null;

  if (currentVolume && baselineVolume) {
    primaryMetric = compareMetric('totalVolumeKg', 'Volume total', 'kg', 'neutral', currentVolume, baselineVolume);
    
    if (primaryMetric.status === 'changed') {
      const isUp = primaryMetric.relativeChangePercent > 0;
      evidence.push(`Seu volume aumentou de ${baselineVolume} kg para ${currentVolume} kg.`);
      if (isUp) {
         evidence.push(`Volume maior não significa necessariamente aumento de força, mas indica maior tolerância a carga de treino.`);
      }
    }
  }

  // Secondary: maxWeightKg
  const extractMaxWeight = (s: ISessionDocument) => (s.metrics as any)?.maxWeightKg ?? null;
  const currentMaxWeight = calculateSportMetricBaseline(currentSessions, extractMaxWeight) ?? (currentSessions[0] ? extractMaxWeight(currentSessions[0]) : null);
  const baselineMaxWeight = calculateSportMetricBaseline(baselineSessions, extractMaxWeight);

  if (currentMaxWeight && baselineMaxWeight) {
    const maxWeightMetric = compareMetric('maxWeightKg', 'Carga máxima (média)', 'kg', 'higher_is_better', currentMaxWeight, baselineMaxWeight);
    secondaryMetrics.push(maxWeightMetric);

    if (maxWeightMetric.status === 'improved') {
      evidence.push(`Você evoluiu sua capacidade máxima de carga, subindo de ${baselineMaxWeight} kg para ${currentMaxWeight} kg (média).`);
    }
  }
  
  // Secondary: estimated1RM
  const extractE1rm = (s: ISessionDocument) => (s.metrics as any)?.estimated1RM ?? null;
  const currentE1rm = calculateSportMetricBaseline(currentSessions, extractE1rm) ?? (currentSessions[0] ? extractE1rm(currentSessions[0]) : null);
  const baselineE1rm = calculateSportMetricBaseline(baselineSessions, extractE1rm);

  if (currentE1rm && baselineE1rm) {
    const e1rmMetric = compareMetric('estimated1RM', 'e1RM médio', 'kg', 'higher_is_better', currentE1rm, baselineE1rm);
    secondaryMetrics.push(e1rmMetric);

    if (e1rmMetric.status === 'improved') {
      evidence.push(`Sua força máxima estimada (1RM) melhorou de ${baselineE1rm} kg para ${currentE1rm} kg.`);
    }
  }

  return { primaryMetric, secondaryMetrics, evidence };
}
