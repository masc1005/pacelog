import type { StrengthSet, StrengthExerciseEntry } from './strength.types.js';

// ==========================================
// VOLUME
// ==========================================

/**
 * Calcula o volume de uma série.
 * Retorna null para séries sem carga numérica real (peso corporal, assistida, etc).
 */
export function calcSetVolume(set: StrengthSet): number | null {
  if (
    set.status !== 'completed' ||
    set.load == null ||
    set.loadUnit === 'bodyweight' ||
    set.loadUnit === 'assisted' ||
    set.loadUnit === 'none' ||
    !set.reps
  ) {
    return null;
  }

  let loadKg = set.load;
  if (set.loadUnit === 'lb') {
    loadKg = set.load * 0.453592;
  }

  return loadKg * set.reps;
}

/**
 * Calcula o volume total em kg de um exercício.
 * Ignora séries sem carga numérica real.
 */
export function calcExerciseVolume(exercise: StrengthExerciseEntry): number | null {
  let total = 0;
  let hasNumericLoad = false;

  for (const set of exercise.sets) {
    const vol = calcSetVolume(set);
    if (vol != null) {
      total += vol;
      hasNumericLoad = true;
    }
  }

  return hasNumericLoad ? total : null;
}

/**
 * Calcula o volume total em kg de todos os exercícios da sessão.
 * Retorna null se nenhuma série tiver carga numérica.
 */
export function calcSessionVolume(exercises: StrengthExerciseEntry[]): number | null {
  let total = 0;
  let hasNumericLoad = false;

  for (const exercise of exercises) {
    const vol = calcExerciseVolume(exercise);
    if (vol != null) {
      total += vol;
      hasNumericLoad = true;
    }
  }

  return hasNumericLoad ? total : null;
}

// ==========================================
// REPETIÇÕES E SÉRIES
// ==========================================

export function calcTotalReps(exercises: StrengthExerciseEntry[]): number {
  return exercises.flatMap((e) => e.sets).reduce((acc, s) => {
    if (s.status === 'completed' && s.reps) {
      return acc + s.reps;
    }
    return acc;
  }, 0);
}

export function calcTotalSets(exercises: StrengthExerciseEntry[]): number {
  return exercises.reduce((acc, e) => acc + e.sets.length, 0);
}

export function calcCompletedSets(exercises: StrengthExerciseEntry[]): number {
  return exercises
    .flatMap((e) => e.sets)
    .filter((s) => s.status === 'completed').length;
}

// ==========================================
// 1RM ESTIMADO (Epley)
// ==========================================

/**
 * Estima o 1RM usando a fórmula de Epley: load × (1 + reps / 30).
 * Retorna null se os dados não forem adequados para estimativa.
 *
 * Condições para estimativa válida:
 * - série concluída;
 * - carga numérica (não peso corporal ou assistida);
 * - 1 ≤ reps ≤ 12.
 */
export function estimateOneRepMax(set: StrengthSet): number | null {
  if (
    set.status !== 'completed' ||
    set.load == null ||
    set.loadUnit === 'bodyweight' ||
    set.loadUnit === 'assisted' ||
    set.loadUnit === 'none' ||
    !set.reps ||
    set.reps < 1 ||
    set.reps > 12
  ) {
    return null;
  }

  let loadKg = set.load;
  if (set.loadUnit === 'lb') {
    loadKg = set.load * 0.453592;
  }

  return Math.round(loadKg * (1 + set.reps / 30) * 100) / 100;
}

/**
 * Retorna o maior 1RM estimado de um exercício (entre todas as séries concluídas).
 */
export function calcBestEstimatedOneRepMax(
  exercise: StrengthExerciseEntry
): number | null {
  let best: number | null = null;

  for (const set of exercise.sets) {
    const orm = estimateOneRepMax(set);
    if (orm != null && (best == null || orm > best)) {
      best = orm;
    }
  }

  return best;
}

/**
 * Retorna o maior 1RM estimado de toda a sessão.
 */
export function calcSessionBestOneRepMax(
  exercises: StrengthExerciseEntry[]
): number | null {
  let best: number | null = null;

  for (const exercise of exercises) {
    const orm = calcBestEstimatedOneRepMax(exercise);
    if (orm != null && (best == null || orm > best)) {
      best = orm;
    }
  }

  return best;
}

// ==========================================
// DURAÇÃO DA SESSÃO (com suporte a pausas)
// ==========================================

/**
 * Calcula a duração líquida da sessão em segundos, descontando o tempo pausado.
 */
export function calcSessionDuration(
  startedAt: string,
  totalPausedSeconds: number,
  now: Date = new Date(),
  pausedAt?: string
): number {
  const start = new Date(startedAt).getTime();
  const nowMs = now.getTime();

  // Se atualmente pausada, o tempo parado é até agora
  const currentPauseSeconds = pausedAt
    ? (nowMs - new Date(pausedAt).getTime()) / 1000
    : 0;

  const elapsed = (nowMs - start) / 1000;
  const net = elapsed - totalPausedSeconds - currentPauseSeconds;

  return Math.max(0, Math.round(net));
}
