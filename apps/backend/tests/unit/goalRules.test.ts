import { describe, it, expect } from 'vitest';
import {
  resolveGoalTimeWindow,
  extractSessionVolume,
  calculateGoalProgress,
  mapGoalToDTO,
} from '../../src/modules/goals/goal.rules.js';

describe('Goal Rules & Progress Calculation Unit Tests', () => {
  const fixedNow = new Date('2026-08-20T12:00:00.000Z');

  describe('resolveGoalTimeWindow', () => {
    it('deve calcular 7 dias atrás para período weekly quando startDate for mais antiga', () => {
      const start = resolveGoalTimeWindow('weekly', new Date('2026-08-01'), fixedNow);
      const expected = new Date('2026-08-13T12:00:00.000Z');
      expect(start.getTime()).toBe(expected.getTime());
    });

    it('NUNCA deve retornar data anterior a startDate para meta criada recentemente (weekly)', () => {
      const recentStart = new Date('2026-08-18T00:00:00.000Z');
      const start = resolveGoalTimeWindow('weekly', recentStart, fixedNow);
      expect(start.getTime()).toBe(recentStart.getTime());
    });

    it('NUNCA deve retornar data anterior a startDate para meta criada recentemente (monthly)', () => {
      const recentStart = new Date('2026-08-01T00:00:00.000Z');
      const start = resolveGoalTimeWindow('monthly', recentStart, fixedNow);
      expect(start.getTime()).toBe(recentStart.getTime());
    });

    it('deve respeitar a startDate personalizada para período custom', () => {
      const customStart = new Date('2026-08-10T00:00:00.000Z');
      const start = resolveGoalTimeWindow('custom', customStart, fixedNow);
      expect(start.getTime()).toBe(customStart.getTime());
    });
  });


  describe('extractSessionVolume', () => {
    it('deve extrair km para corrida a partir de metros', () => {
      const volume = extractSessionVolume({
        sportKey: 'running',
        startedAt: new Date(),
        metrics: { distanceMeters: 10500 },
      });
      expect(volume).toBe(10.5);
    });

    it('deve extrair kg para musculação a partir de totalVolumeKg', () => {
      const volume = extractSessionVolume({
        sportKey: 'strength',
        startedAt: new Date(),
        metrics: { totalVolumeKg: 8400 },
      });
      expect(volume).toBe(8400);
    });

    it('deve extrair contagem de rounds para boxe', () => {
      const volume = extractSessionVolume({
        sportKey: 'boxing',
        startedAt: new Date(),
        metrics: { roundsCount: 12 },
      });
      expect(volume).toBe(12);
    });

    it('deve extrair duração em minutos para outros esportes como fallback', () => {
      const volume = extractSessionVolume({
        sportKey: 'football',
        startedAt: new Date(),
        durationSeconds: 3600,
      });
      expect(volume).toBe(60);
    });
  });

  describe('calculateGoalProgress', () => {
    it('deve calcular progresso de meta de frequência considerando apenas o esporte alvo', () => {
      const goal = { type: 'frequency' as const, targetValue: 4, sportKey: 'running' as const };
      const sessions = [
        { sportKey: 'running' as const, startedAt: new Date() },
        { sportKey: 'running' as const, startedAt: new Date() },
        { sportKey: 'boxing' as const, startedAt: new Date() }, // não deve contar
      ];

      const result = calculateGoalProgress(goal, sessions);
      expect(result.currentValue).toBe(2);
      expect(result.progressPercent).toBe(50);
      expect(result.isAchieved).toBe(false);
    });

    it('deve calcular meta de consistência agrupando treinos no mesmo dia', () => {
      const goal = { type: 'consistency' as const, targetValue: 3, sportKey: null };
      const sessions = [
        { sportKey: 'running' as const, startedAt: '2026-08-18T08:00:00Z' },
        { sportKey: 'strength' as const, startedAt: '2026-08-18T18:00:00Z' }, // mesmo dia
        { sportKey: 'boxing' as const, startedAt: '2026-08-19T09:00:00Z' },
      ];

      const result = calculateGoalProgress(goal, sessions);
      expect(result.currentValue).toBe(2); // 2 dias distintos
      expect(result.progressPercent).toBe(67);
      expect(result.isAchieved).toBe(false);
    });

    it('deve marcar meta como isAchieved quando atingir 100%', () => {
      const goal = { type: 'volume' as const, targetValue: 20, sportKey: 'running' as const };
      const sessions = [
        { sportKey: 'running' as const, startedAt: new Date(), metrics: { distanceMeters: 12000 } },
        { sportKey: 'running' as const, startedAt: new Date(), metrics: { distanceMeters: 10000 } },
      ];

      const result = calculateGoalProgress(goal, sessions);
      expect(result.currentValue).toBe(22);
      expect(result.progressPercent).toBe(100);
      expect(result.isAchieved).toBe(true);
    });
  });

  describe('mapGoalToDTO', () => {
    it('deve atualizar status para completed se a meta for cumprida', () => {
      const fakeDoc: any = {
        _id: 'goal-123',
        userId: 'athlete-1',
        title: 'Meta de Teste',
        type: 'frequency',
        sportKey: null,
        targetValue: 3,
        unit: 'sessões',
        period: 'weekly',
        startDate: new Date(),
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const dto = mapGoalToDTO(fakeDoc, {
        currentValue: 3,
        progressPercent: 100,
        isAchieved: true,
        contributingSessions: [],
      });

      expect(['completed', 'achieved']).toContain(dto.status);
      expect(dto.currentValue).toBe(3);
      expect(dto.progressPercent).toBe(100);
    });
  });
});

