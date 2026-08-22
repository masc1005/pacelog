import type { MetricDirection, MetricComparability } from './load.types.js';
import type { SportKey } from '../index.js';

// ==========================================
// REGISTRO DE MÉTRICAS EXTERNAS E DE DESEMPENHO
// ==========================================

export type MetricCategory = 'load' | 'performance' | 'context';

export type SportMetricDefinition = {
  key: string;
  label: string;
  unit: string;
  category: MetricCategory;
  direction: MetricDirection;
  comparability: MetricComparability;
  required?: boolean;
};

export type SportMetricRegistry = Record<SportKey, SportMetricDefinition[]>;
