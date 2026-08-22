// ==========================================
// TIPOS DE CARGA E PROGRESSO — CONTRATOS OFICIAIS
// ==========================================

export type MetricDirection =
  | 'higher_is_better'
  | 'lower_is_better'
  | 'neutral';

export type MetricComparability =
  | 'cross_sport'   // comparável entre modalidades (ex: sRPE-TL)
  | 'same_sport'    // comparável somente dentro da mesma modalidade
  | 'same_metric';  // comparável somente contra a mesma métrica histórica

export type ConfidenceLevel = 'low' | 'medium' | 'high';

/**
 * Campo `load` estruturado — fonte oficial de carga da sessão.
 * Calculado exclusivamente no backend a partir de `rpe` e `durationSeconds`.
 * `sessionalLoad` permanece como campo legado com o mesmo valor.
 */
export type SessionLoad = {
  srpe: number;              // sRPE-TL = rpe × (durationSeconds / 60)
  rpe: number;               // RPE registrado (1–10, Borg CR10)
  durationMinutes: number;   // duração em minutos (arredondada)
  calculationVersion: number; // versão da fórmula (atualmente 1)
};

export type PeriodDescriptor = {
  key: string;   // ex: 'last_7_days', 'last_28_days'
  start: string; // ISO 8601
  end: string;   // ISO 8601
  label: string; // ex: '7 dias', '4 semanas'
};

export type MetricSnapshot = {
  key: string;
  label: string;
  value: number;
  unit: string;
  direction: MetricDirection;
  comparability: MetricComparability;
};

export type ProgressComparison = {
  currentValue: number;
  baselineValue: number;
  absoluteChange: number;
  relativeChangePercent: number;
  direction: MetricDirection;
  unit: string;
  currentPeriod: PeriodDescriptor;
  baselinePeriod: PeriodDescriptor;
  confidence: ConfidenceLevel;
};

/**
 * Status descritivo de variação de carga — sem linguagem médica ou diagnóstica.
 *
 * baseline         → dentro do padrão histórico
 * elevated_vs_baseline → acima da média recente
 * below_baseline   → abaixo da média recente
 * insufficient_data → sem histórico suficiente para comparar
 * stable           → variação mínima (<5%)
 */
export type LoadVariationStatus =
  | 'baseline'
  | 'elevated_vs_baseline'
  | 'below_baseline'
  | 'insufficient_data'
  | 'stable';
