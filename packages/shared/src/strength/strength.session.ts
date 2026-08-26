import type { ActiveStrengthSession, StrengthExerciseEntry, StrengthSet } from './strength.types.js';

/**
 * Verifica se uma sessão ativa pode ser pausada.
 */
export function canPause(session: ActiveStrengthSession): boolean {
  return session.status === 'active';
}

/**
 * Verifica se uma sessão pausada pode ser retomada.
 */
export function canResume(session: ActiveStrengthSession): boolean {
  return session.status === 'paused';
}

/**
 * Verifica se uma sessão pode ser finalizada.
 */
export function canFinish(session: ActiveStrengthSession): boolean {
  return session.status === 'active' || session.status === 'paused';
}

/**
 * Conta séries pendentes (planejadas mas não concluídas).
 */
export function countPendingSets(exercises: StrengthExerciseEntry[]): number {
  return exercises.flatMap((e) => e.sets).filter((s) => s.status === 'planned').length;
}

/**
 * Retorna exercícios com séries incompletas (sem reps ou carga quando necessário).
 */
export function findIncompleteSets(exercises: StrengthExerciseEntry[]): StrengthSet[] {
  return exercises.flatMap((e) =>
    e.sets.filter(
      (s) =>
        s.status === 'completed' &&
        s.loadUnit !== 'bodyweight' &&
        s.loadUnit !== 'assisted' &&
        s.loadUnit !== 'none' &&
        (s.reps == null || s.load == null)
    )
  );
}

/**
 * Determina se a sessão tem ao menos um exercício com ao menos uma série concluída.
 */
export function hasCompletedWork(exercises: StrengthExerciseEntry[]): boolean {
  return exercises.some((e) => e.sets.some((s) => s.status === 'completed'));
}

/**
 * Reordena os exercícios com base no novo array de IDs.
 * Retorna um novo array com `order` atualizado.
 */
export function reorderExercises(
  exercises: StrengthExerciseEntry[],
  orderedIds: string[]
): StrengthExerciseEntry[] {
  const map = new Map(exercises.map((e) => [e.id, e]));
  return orderedIds.map((id, index) => {
    const exercise = map.get(id);
    if (!exercise) throw new Error(`Exercise not found: ${id}`);
    return { ...exercise, order: index };
  });
}
