import { describe, it, expect } from 'vitest';
import {
  patchSetLocally,
  addSetLocally,
  removeSetLocally,
  addExerciseLocally,
  removeExerciseLocally,
  patchExerciseLocally,
  patchSessionStatusLocally,
} from './strengthOptimistic.utils';
import type { ActiveStrengthSession, StrengthExerciseEntry, StrengthSet } from '@pacelog/shared';

describe('Strength Optimistic State Utilities', () => {
  const initialSession: ActiveStrengthSession = {
    id: 'session-123',
    userId: 'user-456',
    sportKey: 'strength',
    status: 'active',
    startedAt: '2026-08-31T10:00:00.000Z',
    totalPausedSeconds: 0,
    lastActivityAt: '2026-08-31T10:00:00.000Z',
    clientVersion: 1,
    createdAt: '2026-08-31T10:00:00.000Z',
    updatedAt: '2026-08-31T10:00:00.000Z',
    exercises: [
      {
        id: 'ex-1',
        exerciseKey: 'bench_press',
        exerciseNameSnapshot: 'Supino Reto',
        order: 0,
        primaryMuscleGroup: 'peito',
        sets: [
          {
            id: 'set-1',
            setNumber: 1,
            status: 'planned',
            type: 'working',
            reps: 10,
            load: 80,
            loadUnit: 'kg',
          },
          {
            id: 'set-2',
            setNumber: 2,
            status: 'planned',
            type: 'working',
            reps: 8,
            load: 85,
            loadUnit: 'kg',
          },
        ],
      },
    ],
  };

  it('patchSetLocally deve atualizar a série especificada sem mutar o objeto original', () => {
    const updated = patchSetLocally(initialSession, 'ex-1', 'set-1', {
      status: 'completed',
      reps: 12,
      load: 82.5,
    });

    expect(updated).not.toBe(initialSession);
    expect(updated.clientVersion).toBe(2);
    expect(updated.exercises[0].sets[0].status).toBe('completed');
    expect(updated.exercises[0].sets[0].reps).toBe(12);
    expect(updated.exercises[0].sets[0].load).toBe(82.5);
    // A outra série permanece intacta
    expect(updated.exercises[0].sets[1].status).toBe('planned');
    expect(initialSession.exercises[0].sets[0].status).toBe('planned');
  });

  it('addSetLocally deve adicionar série ao exercício correto', () => {
    const newSet: StrengthSet = {
      id: 'set-3',
      setNumber: 3,
      status: 'planned',
      type: 'working',
      reps: 6,
      load: 90,
      loadUnit: 'kg',
    };

    const updated = addSetLocally(initialSession, 'ex-1', newSet);

    expect(updated.exercises[0].sets).toHaveLength(3);
    expect(updated.exercises[0].sets[2].id).toBe('set-3');
    expect(updated.exercises[0].sets[2].load).toBe(90);
  });

  it('removeSetLocally deve remover a série e reindexar as séries subsequentes', () => {
    const updated = removeSetLocally(initialSession, 'ex-1', 'set-1');

    expect(updated.exercises[0].sets).toHaveLength(1);
    expect(updated.exercises[0].sets[0].id).toBe('set-2');
    expect(updated.exercises[0].sets[0].setNumber).toBe(1);
  });

  it('addExerciseLocally deve adicionar um novo exercício', () => {
    const newEx: StrengthExerciseEntry = {
      id: 'ex-2',
      exerciseKey: 'incline_dumbbells',
      exerciseNameSnapshot: 'Supino Inclinado com Halteres',
      order: 1,
      primaryMuscleGroup: 'peito',
      sets: [],
    };

    const updated = addExerciseLocally(initialSession, newEx);

    expect(updated.exercises).toHaveLength(2);
    expect(updated.exercises[1].id).toBe('ex-2');
  });

  it('removeExerciseLocally deve remover o exercício e reindexar a ordem', () => {
    const sessionWithTwo: ActiveStrengthSession = {
      ...initialSession,
      exercises: [
        initialSession.exercises[0],
        {
          id: 'ex-2',
          exerciseKey: 'incline_dumbbells',
          exerciseNameSnapshot: 'Supino Inclinado',
          order: 1,
          sets: [],
        },
      ],
    };

    const updated = removeExerciseLocally(sessionWithTwo, 'ex-1');

    expect(updated.exercises).toHaveLength(1);
    expect(updated.exercises[0].id).toBe('ex-2');
    expect(updated.exercises[0].order).toBe(0);
  });

  it('patchSessionStatusLocally deve alternar status e preencher timestamps', () => {
    const paused = patchSessionStatusLocally(initialSession, 'paused');
    expect(paused.status).toBe('paused');
    expect(paused.pausedAt).toBeDefined();

    const resumed = patchSessionStatusLocally(paused, 'active');
    expect(resumed.status).toBe('active');
    expect(resumed.pausedAt).toBeUndefined();
  });
});
