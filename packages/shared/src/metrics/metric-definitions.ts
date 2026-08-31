import type { SportMetricDefinition, SportMetricRegistry } from './external-metrics.types.js';

// ==========================================
// REGISTRY DE MÉTRICAS POR ESPORTE
// Cada esporte tem métricas de carga, desempenho e contexto.
// Métricas nunca são somadas entre esportes diferentes.
// A métrica primária é a que aparece no progresso individual.
// ==========================================

export const RUNNING_METRICS: SportMetricDefinition[] = [
  // Carga externa
  { key: 'distanceKm', label: 'Distância', unit: 'km', category: 'load', direction: 'higher_is_better', comparability: 'same_sport', required: true },
  { key: 'durationMinutes', label: 'Duração', unit: 'min', category: 'load', direction: 'neutral', comparability: 'same_sport', required: true },
  { key: 'elevationGainMeters', label: 'Ganho de elevação', unit: 'm', category: 'load', direction: 'neutral', comparability: 'same_sport' },
  { key: 'avgHeartRate', label: 'FC média', unit: 'bpm', category: 'context', direction: 'neutral', comparability: 'same_metric' },
  // Desempenho
  { key: 'paceSecondsPerKm', label: 'Pace médio', unit: 's/km', category: 'performance', direction: 'lower_is_better', comparability: 'same_metric', required: true },
  { key: 'srpePerKm', label: 'sRPE por km', unit: 'AU/km', category: 'performance', direction: 'lower_is_better', comparability: 'same_metric' },
];

export const FOOTBALL_METRICS: SportMetricDefinition[] = [
  // Carga externa
  { key: 'minutesPlayed', label: 'Minutos jogados', unit: 'min', category: 'load', direction: 'higher_is_better', comparability: 'same_sport', required: true },
  { key: 'totalDistanceMeters', label: 'Distância total', unit: 'm', category: 'load', direction: 'higher_is_better', comparability: 'same_sport' },
  // Desempenho
  { key: 'goals', label: 'Gols', unit: 'gols', category: 'performance', direction: 'higher_is_better', comparability: 'same_metric' },
  { key: 'assists', label: 'Assistências', unit: 'ast', category: 'performance', direction: 'higher_is_better', comparability: 'same_metric' },
];

export const FUTEVOLEI_METRICS: SportMetricDefinition[] = [
  // Carga externa
  { key: 'setsCount', label: 'Sets jogados', unit: 'sets', category: 'load', direction: 'neutral', comparability: 'same_sport', required: true },
  { key: 'durationMinutes', label: 'Duração', unit: 'min', category: 'load', direction: 'neutral', comparability: 'same_sport', required: true },
  // Desempenho
  { key: 'technicalAverage', label: 'Média técnica', unit: '/5', category: 'performance', direction: 'higher_is_better', comparability: 'same_metric', required: true },
  { key: 'setsWonRate', label: 'Taxa de sets vencidos', unit: '%', category: 'performance', direction: 'higher_is_better', comparability: 'same_metric' },
];

export const BOXING_METRICS: SportMetricDefinition[] = [
  // Carga externa
  { key: 'roundsCount', label: 'Rounds concluídos', unit: 'rounds', category: 'load', direction: 'neutral', comparability: 'same_sport', required: true },
  { key: 'activeTimeSeconds', label: 'Tempo ativo', unit: 's', category: 'load', direction: 'neutral', comparability: 'same_sport' },
  { key: 'restTimeSeconds', label: 'Tempo de descanso', unit: 's', category: 'context', direction: 'neutral', comparability: 'same_sport' },
  // Desempenho
  { key: 'roundCompletionRate', label: 'Conclusão de rounds', unit: '%', category: 'performance', direction: 'higher_is_better', comparability: 'same_metric', required: true },
];

export const STRENGTH_METRICS: SportMetricDefinition[] = [
  // Carga externa
  { key: 'totalVolumeKg', label: 'Volume total', unit: 'kg', category: 'load', direction: 'neutral', comparability: 'same_metric', required: true },
  { key: 'totalSets', label: 'Séries totais', unit: 'séries', category: 'load', direction: 'neutral', comparability: 'same_metric' },
  { key: 'totalReps', label: 'Repetições totais', unit: 'reps', category: 'load', direction: 'neutral', comparability: 'same_metric' },
  // Desempenho (contexto: volume maior NÃO é automaticamente melhora)
  { key: 'avgRpePerSet', label: 'RPE médio por série', unit: '/10', category: 'performance', direction: 'neutral', comparability: 'same_metric' },
  { key: 'maxWeightKg', label: 'Carga máxima (por exercício)', unit: 'kg', category: 'performance', direction: 'higher_is_better', comparability: 'same_metric' },
  { key: 'estimated1RM', label: 'e1RM (por exercício)', unit: 'kg', category: 'performance', direction: 'higher_is_better', comparability: 'same_metric' },
];

export const SWIMMING_METRICS: SportMetricDefinition[] = [
  // Carga externa
  { key: 'totalDistanceMeters', label: 'Distância', unit: 'm', category: 'load', direction: 'higher_is_better', comparability: 'same_sport', required: true },
  { key: 'durationMinutes', label: 'Duração', unit: 'min', category: 'load', direction: 'neutral', comparability: 'same_sport', required: true },
  { key: 'totalLaps', label: 'Piscinas', unit: 'laps', category: 'load', direction: 'neutral', comparability: 'same_sport' },
  // Desempenho
  { key: 'paceSecondsPer100m', label: 'Pace médio', unit: 's/100m', category: 'performance', direction: 'lower_is_better', comparability: 'same_metric', required: true },
  { key: 'swolf', label: 'SWOLF', unit: 'score', category: 'performance', direction: 'lower_is_better', comparability: 'same_metric' },
];

export const CYCLING_METRICS: SportMetricDefinition[] = [
  // Carga externa
  { key: 'distanceKm', label: 'Distância', unit: 'km', category: 'load', direction: 'higher_is_better', comparability: 'same_sport', required: true },
  { key: 'durationMinutes', label: 'Duração', unit: 'min', category: 'load', direction: 'neutral', comparability: 'same_sport', required: true },
  { key: 'elevationGainMeters', label: 'Ganho de elevação', unit: 'm', category: 'load', direction: 'higher_is_better', comparability: 'same_sport' },
  { key: 'averageHeartRate', label: 'FC média', unit: 'bpm', category: 'context', direction: 'neutral', comparability: 'same_metric' },
  // Desempenho
  { key: 'averageSpeedKmh', label: 'Velocidade média', unit: 'km/h', category: 'performance', direction: 'higher_is_better', comparability: 'same_sport', required: true },
  { key: 'paceSecondsPerKm', label: 'Pace médio', unit: 's/km', category: 'performance', direction: 'lower_is_better', comparability: 'same_metric' },
];

export const JIUJITSU_METRICS: SportMetricDefinition[] = [
  // Carga externa
  { key: 'durationMinutes', label: 'Duração', unit: 'min', category: 'load', direction: 'neutral', comparability: 'same_sport', required: true },
  { key: 'roundsCount', label: 'Rolas por sessão', unit: 'rolas', category: 'performance', direction: 'higher_is_better', comparability: 'same_sport' },
  { key: 'averageRoundDurationSeconds', label: 'Duração média por rola', unit: 's', category: 'load', direction: 'neutral', comparability: 'same_sport' },
  // Contexto pedagógico
  { key: 'submissionsLanded', label: 'Finalizações aplicadas', unit: 'submissões', category: 'performance', direction: 'higher_is_better', comparability: 'same_sport' },
  { key: 'submissionsReceived', label: 'Finalizações sofridas', unit: 'submissões', category: 'context', direction: 'neutral', comparability: 'same_sport' },
];

/**
 * Registry central de métricas por esporte.
 * Consulte este objeto para saber o que exibir, com qual unidade e direção.
 */
export const SPORT_METRIC_REGISTRY: SportMetricRegistry = {
  running: RUNNING_METRICS,
  football: FOOTBALL_METRICS,
  futevolei: FUTEVOLEI_METRICS,
  boxing: BOXING_METRICS,
  strength: STRENGTH_METRICS,
  swimming: SWIMMING_METRICS,
  cycling: CYCLING_METRICS,
  jiujitsu: JIUJITSU_METRICS,
};

/**
 * Chave da métrica principal por esporte — usada nos cards de progresso.
 * A métrica principal é escolhida para representar o desempenho de forma simplificada.
 */
export const PRIMARY_METRIC_KEY: Record<string, string> = {
  running: 'paceSecondsPerKm',
  football: 'minutesPlayed',
  futevolei: 'technicalAverage',
  boxing: 'roundCompletionRate',
  strength: 'totalVolumeKg',
  swimming: 'paceSecondsPer100m',
  cycling: 'averageSpeedKmh',
  jiujitsu: 'roundsCount',
};

/**
 * Retorna a definição da métrica principal de um esporte.
 */
export function getPrimaryMetricDefinition(sportKey: string): SportMetricDefinition | null {
  const key = PRIMARY_METRIC_KEY[sportKey];
  if (!key) return null;
  const registry = SPORT_METRIC_REGISTRY[sportKey as keyof SportMetricRegistry] || [];
  return registry.find(m => m.key === key) || null;
}
