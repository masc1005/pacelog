import type { MetricDirection, ProgressMetric, ProgressStatus } from '@pacelog/shared';

/**
 * Compara um valor atual com o baseline considerando a direção da métrica.
 * Retorna o objeto ProgressMetric preenchido com variação relativa e status.
 */
export function compareMetric(
  key: string,
  label: string,
  unit: string,
  direction: MetricDirection,
  currentValue: number,
  baselineValue: number
): ProgressMetric {
  const absBaseline = Math.abs(baselineValue);
  let relativeChangePercent = 0;

  if (absBaseline > 0) {
    if (direction === 'lower_is_better') {
      // Pace menor = melhora = percentual positivo
      relativeChangePercent = Math.round(((baselineValue - currentValue) / absBaseline) * 1000) / 10;
    } else {
      // Volume ou pontos maiores = variação positiva
      relativeChangePercent = Math.round(((currentValue - baselineValue) / absBaseline) * 1000) / 10;
    }
  }

  let status: ProgressStatus = 'stable';
  
  if (Math.abs(relativeChangePercent) > 2) { // Variação mínima de 2% para não ser considerado estável
    if (direction === 'neutral') {
      status = 'changed';
    } else if (relativeChangePercent > 0) {
      status = 'improved';
    } else {
      status = 'declined';
    }
  }

  return {
    key,
    label,
    currentValue,
    baselineValue,
    relativeChangePercent,
    unit,
    direction,
    status
  };
}
