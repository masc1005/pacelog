import type {
  ConfidenceLevel,
  LoadVariationStatus,
  ProgressComparison,
  PeriodDescriptor,
  MetricDirection,
} from '@pacelog/shared';
import type { ISessionDocument } from '../sessions/session.model.js';

// ==========================================
// REGRAS DE CONFIANÇA
// Low:    < 3 sessões ou < 14 dias de histórico
// Medium: 3–7 sessões e ≥ 14 dias
// High:   ≥ 8 sessões e ≥ 28 dias com dados completos
// ==========================================

export function calculateConfidence(
  sessionsCount: number,
  daysOfHistory: number
): ConfidenceLevel {
  if (sessionsCount < 3 || daysOfHistory < 14) return 'low';
  if (sessionsCount >= 8 && daysOfHistory >= 28) return 'high';
  return 'medium';
}

// ==========================================
// CARGA SEMANAL
// ==========================================

export type WeeklyLoad = {
  weekLabel: string;
  startDate: Date;
  endDate: Date;
  totalSrpe: number;
  sessionsCount: number;
};

/**
 * Calcula a carga sRPE semanal a partir de uma lista de sessões.
 * Organiza por semana ISO (segunda como início).
 */
export function calculateWeeklySrpeLoad(sessions: ISessionDocument[]): WeeklyLoad[] {
  const weekMap = new Map<string, WeeklyLoad>();

  for (const session of sessions) {
    const srpe = (session as any).load?.srpe ?? session.sessionalLoad ?? 0;
    if (srpe <= 0) continue;

    const date = new Date(session.startedAt);
    // Semana começa na segunda-feira (ISO)
    const dayOfWeek = (date.getDay() + 6) % 7; // 0=Mon, 6=Sun
    const monday = new Date(date);
    monday.setDate(date.getDate() - dayOfWeek);
    monday.setHours(0, 0, 0, 0);

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);

    const key = monday.toISOString().split('T')[0];
    const label = monday.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });

    if (!weekMap.has(key)) {
      weekMap.set(key, {
        weekLabel: label,
        startDate: monday,
        endDate: sunday,
        totalSrpe: 0,
        sessionsCount: 0,
      });
    }

    const week = weekMap.get(key)!;
    week.totalSrpe += srpe;
    week.sessionsCount += 1;
  }

  return Array.from(weekMap.values()).sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
}

// ==========================================
// BASELINE DE 4 SEMANAS
// ==========================================

/**
 * Calcula a média semanal das últimas 4 semanas como baseline.
 * Retorna `null` se não houver semanas suficientes.
 */
export function calculateFourWeekBaseline(weeklyLoads: WeeklyLoad[]): number | null {
  if (weeklyLoads.length === 0) return null;
  const last4 = weeklyLoads.slice(-4);
  const sum = last4.reduce((acc, w) => acc + w.totalSrpe, 0);
  return Math.round(sum / last4.length);
}

// ==========================================
// BASELINE POR MÉTRICA DE ESPORTE
// ==========================================

/**
 * Calcula o valor médio de uma métrica de esporte nas últimas sessões comparáveis.
 * Usa as últimas 3 sessões do mesmo esporte como baseline.
 */
export function calculateSportMetricBaseline(
  sessions: ISessionDocument[],
  extractValue: (session: ISessionDocument) => number | null
): number | null {
  const values = sessions
    .map(extractValue)
    .filter((v): v is number => v !== null && v > 0);

  if (values.length < 3) return null;

  const last3 = values.slice(-3);
  return Math.round((last3.reduce((a, b) => a + b, 0) / last3.length) * 100) / 100;
}

// ==========================================
// COMPARAÇÃO COM BASELINE
// ==========================================

/**
 * Compara um valor atual com o baseline considerando a direção da métrica.
 *
 * Para `lower_is_better` (ex: pace):
 *   improvement = ((baseline - current) / abs(baseline)) × 100
 *   Um pace menor = variação positiva = melhora.
 *
 * Para `higher_is_better` (ex: rounds, volume):
 *   variation = ((current - baseline) / abs(baseline)) × 100
 *
 * Para `neutral`:
 *   variation = ((current - baseline) / abs(baseline)) × 100
 *   Não interpreta como melhora ou piora.
 */
export function compareWithBaseline(
  currentValue: number,
  baselineValue: number,
  direction: MetricDirection,
  unit: string,
  currentPeriod: PeriodDescriptor,
  baselinePeriod: PeriodDescriptor,
  confidence: ConfidenceLevel
): ProgressComparison {
  const absoluteChange = currentValue - baselineValue;
  const absBaseline = Math.abs(baselineValue);

  let relativeChangePercent = 0;
  if (absBaseline > 0) {
    if (direction === 'lower_is_better') {
      // Pace menor = melhora = percentual positivo
      relativeChangePercent = Math.round(((baselineValue - currentValue) / absBaseline) * 1000) / 10;
    } else {
      relativeChangePercent = Math.round(((currentValue - baselineValue) / absBaseline) * 1000) / 10;
    }
  }

  return {
    currentValue,
    baselineValue,
    absoluteChange: Math.round(absoluteChange * 100) / 100,
    relativeChangePercent,
    direction,
    unit,
    currentPeriod,
    baselinePeriod,
    confidence,
  };
}

// ==========================================
// STATUS DE VARIAÇÃO DESCRITIVO
// ==========================================

/**
 * Retorna o status de variação de carga sem linguagem médica ou diagnóstica.
 * Usa comparação descritiva com o baseline.
 */
export function classifyLoadVariation(
  variationPercent: number,
  confidence: ConfidenceLevel
): LoadVariationStatus {
  if (confidence === 'low') return 'insufficient_data';
  if (Math.abs(variationPercent) <= 5) return 'stable';
  if (variationPercent > 5) return 'elevated_vs_baseline';
  return 'below_baseline';
}

export function buildLoadStatusLabel(status: LoadVariationStatus): string {
  const labels: Record<LoadVariationStatus, string> = {
    baseline: 'Dentro do seu padrão recente',
    elevated_vs_baseline: 'Acima do seu padrão recente',
    below_baseline: 'Abaixo do seu padrão recente',
    insufficient_data: 'Dados insuficientes para comparar',
    stable: 'Estável em relação ao histórico',
  };
  return labels[status] ?? status;
}

export function buildLoadStatusMessage(
  status: LoadVariationStatus,
  variationPercent: number,
  windowLabel: string
): string {
  const absVariation = Math.abs(variationPercent).toFixed(1);
  const comparisonTarget =
    windowLabel === 'semana passada' || windowLabel === 'semana anterior'
      ? `à ${windowLabel}`
      : windowLabel.startsWith('da') || windowLabel.startsWith('à')
      ? `à média ${windowLabel}`
      : `ao histórico ${windowLabel}`;

  switch (status) {
    case 'elevated_vs_baseline':
      return `Sua carga percebida está ${absVariation}% acima em relação ${comparisonTarget}.`;
    case 'below_baseline':
      return `Sua carga percebida está ${absVariation}% abaixo em relação ${comparisonTarget}.`;
    case 'stable':
      return `Sua carga percebida está estável em relação ${comparisonTarget}.`;
    case 'insufficient_data':
      return `Histórico insuficiente para comparar com um período anterior.`;
    default:
      return `Carga dentro do padrão em relação ${comparisonTarget}.`;
  }
}

/** Disclaimer padrão — presente em todas as respostas de carga */
export const LOAD_DISCLAIMER =
  'Esta é uma comparação descritiva com seu histórico de treinos, não uma avaliação médica ou diagnóstico.';
