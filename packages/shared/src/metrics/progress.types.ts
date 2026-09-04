import type { ConfidenceLevel, LoadVariationStatus, PeriodDescriptor, ProgressComparison, MetricDirection } from './load.types.js';
import type { SportKey } from '../index.js';

// ==========================================
// DTOs DE PROGRESSO V2 — NOVOS CONTRATOS
// ==========================================

export type ProgressStatus =
  | 'improved'
  | 'stable'
  | 'declined'
  | 'changed'
  | 'insufficient_data';

export type ProgressMetric = {
  key: string;
  label: string;
  currentValue: number;
  baselineValue: number;
  relativeChangePercent: number;
  unit: string;
  direction: MetricDirection;
  status: ProgressStatus;
};

export type SportProgress = {
  sportKey: SportKey;
  sportLabel: string;
  sessions: {
    current: number;
    baseline: number;
    variationPercent: number;
  };
  primaryMetric: ProgressMetric;
  secondaryMetrics: ProgressMetric[];
  loadContext: {
    currentSrpe: number | null;
    baselineSrpe: number | null;
    variationPercent: number | null;
  };
  evidence: string[];
  confidence: ConfidenceLevel;
};

export type ProgressComparisonDTO = {
  period: PeriodDescriptor;
  overall: {
    currentSessions: number;
    baselineSessions: number;
    consistencyPercent: number;
    baselineConsistencyPercent: number;
  };
  sports: SportProgress[];
  ranking: {
    mostImproved: SportKey | null;
    mostConsistent: SportKey | null;
    mostEfficient: SportKey | null;
  };
  loadContext: {
    currentSrpe: number | null;
    baselineSrpe: number | null;
    variationPercent: number | null;
    distributionBySport: Array<{
      sportKey: SportKey;
      srpe: number;
      sharePercent: number;
    }>;
  };
  confidence: ConfidenceLevel;
};

// ==========================================
// DTOs DE PROGRESSO V2 — AGREGADOS GERAIS
// ==========================================

export type LoadSummary = {
  currentSrpe: number;        // carga atual do período
  baselineSrpe: number;       // baseline de comparação (média 4 semanas)
  variationPercent: number;   // ((current - baseline) / abs(baseline)) * 100
  unit: 'AU';                 // Arbitrary Units — padrão do sRPE-TL
  confidence: ConfidenceLevel;
  status: LoadVariationStatus;
  statusLabel: string;        // ex: 'Acima do seu padrão recente'
  statusMessage: string;      // ex: 'Sua carga percebida está 29% acima...'
  disclaimer: string;         // sempre: comparação descritiva, não avaliação médica
  windowLabel?: string;       // ex: 'semana passada' ou 'semana anterior'
};

export type SportLoadSummary = {
  sportKey: SportKey;
  sportLabel: string;
  currentSrpe: number;
  baselineSrpe: number;
  variationPercent: number;
  sharePercent: number;       // % da carga total do período
};

export type SportProgressV2 = {
  sportKey: SportKey;
  sportLabel: string;
  primaryMetricKey: string;
  primaryMetricLabel: string;
  primaryMetricUnit: string;
  primaryMetricDirection: 'higher_is_better' | 'lower_is_better' | 'neutral';
  comparison: ProgressComparison | null;   // null quando confiança insuficiente
  load: {
    currentSrpe: number;
    baselineSrpe: number;
    variationPercent: number;
    confidence: ConfidenceLevel;
  };
  evidence: string[];         // frases descritivas determinísticas (sem IA)
  confidence: ConfidenceLevel;
  sessionsCount: number;
};

/**
 * DTO principal do endpoint GET /api/progress/summary
 */
export type ProgressSummaryDTO = {
  period: PeriodDescriptor;
  load: LoadSummary;
  sessions: {
    current: number;
    baseline: number;
    variationPercent: number;
  };
  bySport: SportLoadSummary[];
  distribution: Array<{
    sportKey: SportKey;
    sportLabel: string;
    srpe: number;
    sharePercent: number;
  }>;
  explanations: string[];  // frases determinísticas geradas no backend
};

/**
 * DTO do endpoint GET /api/progress/by-sport
 */
export type ProgressBySportDTO = SportProgressV2;

/**
 * DTO do endpoint GET /api/progress/load
 */
export type ProgressLoadDTO = {
  period: PeriodDescriptor;
  weekly: Array<{
    weekLabel: string;
    startDate: string;
    totalSrpe: number;
    sessionsCount: number;
  }>;
  baseline: {
    fourWeekAvg: number;
    lastWeek: number;
  };
  current: {
    srpe: number;
    sessionsCount: number;
  };
  confidence: ConfidenceLevel;
  status: LoadVariationStatus;
};

/**
 * DTO do endpoint GET /api/progress/timeline
 */
export type ProgressTimelineDTO = {
  period: PeriodDescriptor;
  points: Array<{
    date: string;            // YYYY-MM-DD
    srpe: number;
    sessionsCount: number;
    sportKeys: SportKey[];
  }>;
};
