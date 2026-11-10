import { randomUUID } from 'crypto';
import { WeeklyScheduleModel, type IWeeklyScheduleDocument } from './schedule.model.js';
import type {
  WeeklyScheduleDayPlan,
  UpdateWeeklyScheduleDayInput,
  UpdateWeeklyScheduleInput,
} from '@pacelog/shared';

function createDefaultDays(): WeeklyScheduleDayPlan[] {
  return Array.from({ length: 7 }, (_, weekday) => ({
    weekday,
    isRestDay: weekday === 6, // 6 = Domingo como descanso por padrão inicial (0 = Segunda ... 6 = Domingo)
    workouts: [],
  }));
}

function normalizeDays(days: WeeklyScheduleDayPlan[]): WeeklyScheduleDayPlan[] {
  const map = new Map<number, WeeklyScheduleDayPlan>();
  for (const d of days || []) {
    if (d.weekday >= 0 && d.weekday <= 6) {
      map.set(d.weekday, {
        weekday: d.weekday,
        isRestDay: Boolean(d.isRestDay),
        workouts: d.isRestDay
          ? []
          : (d.workouts || []).map((w) => ({
              id: w.id || randomUUID(),
              sportKey: w.sportKey,
              title: w.title?.trim() || undefined,
              routineId: w.routineId || undefined,
              routineName: w.routineName?.trim() || undefined,
              targetDurationMinutes: w.targetDurationMinutes,
              plannedTime: w.plannedTime?.trim() || undefined,
              notes: w.notes?.trim() || undefined,
            })),
      });
    }
  }

  return Array.from({ length: 7 }, (_, weekday) => {
    return (
      map.get(weekday) ?? {
        weekday,
        isRestDay: false,
        workouts: [],
      }
    );
  });
}

export class WeeklyScheduleService {
  async getSchedule(userId: string): Promise<IWeeklyScheduleDocument> {
    let schedule = await WeeklyScheduleModel.findOne({ userId });
    if (!schedule) {
      schedule = await WeeklyScheduleModel.create({
        userId,
        days: createDefaultDays(),
      });
    } else if (!schedule.days || schedule.days.length < 7) {
      schedule.days = normalizeDays(schedule.days || []);
      await schedule.save();
    }
    return schedule;
  }

  async updateDay(
    userId: string,
    input: UpdateWeeklyScheduleDayInput
  ): Promise<IWeeklyScheduleDocument> {
    const schedule = await this.getSchedule(userId);
    const currentDays = normalizeDays(schedule.days);

    const updatedDay: WeeklyScheduleDayPlan = {
      weekday: input.weekday,
      isRestDay: Boolean(input.isRestDay),
      workouts: input.isRestDay
        ? []
        : (input.workouts || []).map((w) => ({
            id: w.id || randomUUID(),
            sportKey: w.sportKey,
            title: w.title?.trim() || undefined,
            routineId: w.routineId || undefined,
            routineName: w.routineName?.trim() || undefined,
            targetDurationMinutes: w.targetDurationMinutes,
            plannedTime: w.plannedTime?.trim() || undefined,
            notes: w.notes?.trim() || undefined,
          })),
    };

    const nextDays = currentDays.map((d) =>
      d.weekday === input.weekday ? updatedDay : d
    );

    schedule.days = nextDays;
    return schedule.save();
  }

  async updateFullSchedule(
    userId: string,
    input: UpdateWeeklyScheduleInput
  ): Promise<IWeeklyScheduleDocument> {
    const schedule = await this.getSchedule(userId);
    const mergedMap = new Map<number, WeeklyScheduleDayPlan>();

    for (const d of normalizeDays(schedule.days)) {
      mergedMap.set(d.weekday, d);
    }

    for (const d of input.days) {
      mergedMap.set(d.weekday, {
        weekday: d.weekday,
        isRestDay: Boolean(d.isRestDay),
        workouts: d.isRestDay
          ? []
          : (d.workouts || []).map((w) => ({
              id: w.id || randomUUID(),
              sportKey: w.sportKey,
              title: w.title?.trim() || undefined,
              routineId: w.routineId || undefined,
              routineName: w.routineName?.trim() || undefined,
              targetDurationMinutes: w.targetDurationMinutes,
              plannedTime: w.plannedTime?.trim() || undefined,
              notes: w.notes?.trim() || undefined,
            })),
      });
    }

    schedule.days = Array.from({ length: 7 }, (_, idx) => mergedMap.get(idx)!);
    return schedule.save();
  }
}

export const weeklyScheduleService = new WeeklyScheduleService();
