import { describe, it, expect } from 'vitest';
import { weeklyScheduleService } from '../../src/modules/schedule/schedule.service.js';
import { generateAIScheduleSchema } from '@pacelog/shared';

describe('AI Weekly Schedule Planner (schedule.service)', () => {
  it('validates input schema with fixed weekdays and activities', () => {
    const parsed = generateAIScheduleSchema.parse({
      activities: [
        { sportKey: 'boxing', sessionsPerWeek: 1, fixedWeekdays: [5], targetDurationMinutes: 60 },
        { sportKey: 'strength', sessionsPerWeek: 3, fixedWeekdays: [], targetDurationMinutes: 50 },
        { sportKey: 'running', sessionsPerWeek: 2, fixedWeekdays: [1], targetDurationMinutes: 45 },
      ],
      restWeekdays: [6],
      allowDoubleSessions: true,
    });

    expect(parsed.activities).toHaveLength(3);
    expect(parsed.activities[0].fixedWeekdays).toEqual([5]);
  });

  it('strictly respects fixed weekdays (e.g. Saturday = Boxing) and distributes remaining sessions across the 7 days', () => {
    const routines = [
      {
        _id: 'routine-upper',
        name: 'Treino A - Superiores',
        exercises: [{ primaryMuscleGroup: 'peito' }, { primaryMuscleGroup: 'costas' }],
      },
      {
        _id: 'routine-lower',
        name: 'Treino B - Pernas',
        exercises: [{ primaryMuscleGroup: 'quadriceps' }, { primaryMuscleGroup: 'posteriores' }],
      },
    ];

    const result = weeklyScheduleService.buildDeterministicAISchedule(
      {
        activities: [
          {
            sportKey: 'boxing',
            sessionsPerWeek: 2,
            fixedWeekdays: [5], // 5 = Sábado fixo para Boxe
            targetDurationMinutes: 60,
          },
          {
            sportKey: 'strength',
            sessionsPerWeek: 3,
            fixedWeekdays: [],
            targetDurationMinutes: 50,
          },
          {
            sportKey: 'running',
            sessionsPerWeek: 2,
            fixedWeekdays: [1], // 1 = Terça-feira fixa para Corrida
            targetDurationMinutes: 45,
          },
        ],
        restWeekdays: [6], // 6 = Domingo como descanso
        allowDoubleSessions: true,
      },
      routines
    );

    expect(result.days).toHaveLength(7);

    // Verifica que Sábado (weekday=5) tem Boxe
    const saturday = result.days.find((d) => d.weekday === 5)!;
    expect(saturday.isRestDay).toBe(false);
    expect(saturday.workouts.some((w) => w.sportKey === 'boxing')).toBe(true);

    // Verifica que Terça-feira (weekday=1) tem Corrida
    const tuesday = result.days.find((d) => d.weekday === 1)!;
    expect(tuesday.isRestDay).toBe(false);
    expect(tuesday.workouts.some((w) => w.sportKey === 'running')).toBe(true);

    // Verifica que Domingo (weekday=6) permaneceu como descanso
    const sunday = result.days.find((d) => d.weekday === 6)!;
    expect(sunday.isRestDay).toBe(true);
    expect(sunday.workouts).toHaveLength(0);

    // Verifica contagem total de sessões na semana por modalidade
    const allWorkouts = result.days.flatMap((d) => d.workouts);
    expect(allWorkouts.filter((w) => w.sportKey === 'boxing')).toHaveLength(2);
    expect(allWorkouts.filter((w) => w.sportKey === 'running')).toHaveLength(2);
    expect(allWorkouts.filter((w) => w.sportKey === 'strength')).toHaveLength(3);

    // Verifica que os treinos de musculação receberam vínculo com as fichas salvas
    const strengthWorkouts = allWorkouts.filter((w) => w.sportKey === 'strength');
    expect(strengthWorkouts.every((w) => Boolean(w.routineId && w.routineName))).toBe(true);
  });
});
