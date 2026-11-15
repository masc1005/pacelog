import type {
  ActiveStrengthSession,
  StrengthExerciseEntry,
  StrengthSet,
} from '@pacelog/shared';

/**
 * Atualiza um conjunto específico de propriedades de uma série dentro de um exercício de forma imutável.
 */
export function patchSetLocally(
  session: ActiveStrengthSession,
  exerciseId: string,
  setId: string,
  changes: Partial<StrengthSet>
): ActiveStrengthSession {
  return {
    ...session,
    clientVersion: session.clientVersion + 1,
    lastActivityAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    exercises: session.exercises.map((ex) => {
      if (ex.id !== exerciseId) return ex;
      return {
        ...ex,
        sets: ex.sets.map((s) => {
          if (s.id !== setId) return s;
          return {
            ...s,
            ...changes,
          };
        }),
      };
    }),
  };
}

/**
 * Adiciona uma nova série a um exercício da sessão de forma imutável.
 */
export function addSetLocally(
  session: ActiveStrengthSession,
  exerciseId: string,
  newSet: StrengthSet
): ActiveStrengthSession {
  return {
    ...session,
    clientVersion: session.clientVersion + 1,
    lastActivityAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    exercises: session.exercises.map((ex) => {
      if (ex.id !== exerciseId) return ex;
      return {
        ...ex,
        sets: [...ex.sets, newSet],
      };
    }),
  };
}

/**
 * Remove uma série de um exercício e renumera as séries subsequentes de forma imutável.
 */
export function removeSetLocally(
  session: ActiveStrengthSession,
  exerciseId: string,
  setId: string
): ActiveStrengthSession {
  return {
    ...session,
    clientVersion: session.clientVersion + 1,
    lastActivityAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    exercises: session.exercises.map((ex) => {
      if (ex.id !== exerciseId) return ex;
      const filteredSets = ex.sets.filter((s) => s.id !== setId);
      // Renumera as séries restantes para manter consistência visual
      const reindexedSets = filteredSets.map((s, idx) => ({
        ...s,
        setNumber: idx + 1,
      }));
      return {
        ...ex,
        sets: reindexedSets,
      };
    }),
  };
}

/**
 * Adiciona um exercício no final da lista da sessão de forma imutável.
 */
export function addExerciseLocally(
  session: ActiveStrengthSession,
  exercise: StrengthExerciseEntry
): ActiveStrengthSession {
  return {
    ...session,
    clientVersion: session.clientVersion + 1,
    lastActivityAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    exercises: [...session.exercises, exercise],
  };
}

/**
 * Remove um exercício da sessão e reordena os exercícios restantes de forma imutável.
 */
export function removeExerciseLocally(
  session: ActiveStrengthSession,
  exerciseId: string
): ActiveStrengthSession {
  const filtered = session.exercises.filter((ex) => ex.id !== exerciseId);
  const reordered = filtered.map((ex, idx) => ({
    ...ex,
    order: idx,
  }));

  return {
    ...session,
    clientVersion: session.clientVersion + 1,
    lastActivityAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    exercises: reordered,
  };
}

/**
 * Atualiza propriedades do exercício (como notas) de forma imutável.
 */
export function patchExerciseLocally(
  session: ActiveStrengthSession,
  exerciseId: string,
  changes: Partial<StrengthExerciseEntry>
): ActiveStrengthSession {
  return {
    ...session,
    clientVersion: session.clientVersion + 1,
    lastActivityAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    exercises: session.exercises.map((ex) => {
      if (ex.id !== exerciseId) return ex;
      return {
        ...ex,
        ...changes,
      };
    }),
  };
}

/**
 * Atualiza o status da sessão (ex: pausada / ativa).
 */
export function patchSessionStatusLocally(
  session: ActiveStrengthSession,
  status: ActiveStrengthSession['status']
): ActiveStrengthSession {
  const now = new Date().toISOString();
  return {
    ...session,
    status,
    pausedAt: status === 'paused' ? now : undefined,
    lastActivityAt: now,
    updatedAt: now,
  };
}

/**
 * Encontra o timestamp da última série concluída na sessão.
 */
export function getLastCompletedSetTime(session: {
  exercises?: Array<{ sets?: Array<{ status?: string; completedAt?: string | Date | null }> }>;
}): Date | null {
  let latest: Date | null = null;
  for (const ex of session.exercises || []) {
    for (const set of ex.sets || []) {
      if (set.status === "completed" && set.completedAt) {
        const d = new Date(set.completedAt);
        if (!isNaN(d.getTime())) {
          if (!latest || d.getTime() > latest.getTime()) {
            latest = d;
          }
        }
      }
    }
  }
  return latest;
}

/**
 * Detecta se o atleta provavelmente esqueceu o timer ligado após a última série.
 * Critério: diferença >= 15 minutos entre a última série e o momento de referência (término ou agora).
 */
export function detectForgottenTimer(
  session: {
    startedAt: string | Date;
    finishedAt?: string | Date | null;
    exercises?: Array<{ sets?: Array<{ status?: string; completedAt?: string | Date | null }> }>;
  },
  referenceTimeMs: number = Date.now()
): {
  forgotten: boolean;
  durationUntilLastSetMinutes: number;
  diffMinutes: number;
} | null {
  const lastSet = getLastCompletedSetTime(session);
  if (!lastSet) return null;

  const diffMs = referenceTimeMs - lastSet.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);

  if (diffMinutes >= 15) {
    const startedMs = new Date(session.startedAt).getTime();
    const durationUntilLastSetMinutes = Math.max(
      1,
      Math.round((lastSet.getTime() - startedMs) / 60000)
    );
    return {
      forgotten: true,
      durationUntilLastSetMinutes,
      diffMinutes,
    };
  }

  return null;
}
