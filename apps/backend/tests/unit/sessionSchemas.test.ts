import { describe, it, expect } from 'vitest';
import {
  createSessionSchema,
  updateSessionSchema,
  listSessionsQuerySchema,
} from '../../src/modules/sessions/session.schemas.js';
import { exerciseSearchQuerySchema } from '../../src/modules/strength/strength-session.schemas.js';

describe('Session Schemas Zod Validation Unit Tests', () => {
  describe('createSessionSchema (Discriminated Union)', () => {
    it('deve validar com sucesso uma sessão de Corrida (running)', () => {
      const payload = {
        sportKey: 'running',
        rpe: 7,
        startedAt: new Date().toISOString(),
        metrics: {
          distanceMeters: 10000,
          durationSeconds: 3000,
          avgHeartRate: 155,
          maxHeartRate: 172,
          splits: [
            { km: 1, splitTimeSeconds: 300, paceSecondsPerKm: 300 },
            { km: 2, splitTimeSeconds: 295, paceSecondsPerKm: 295 },
          ],
        },
      };

      const result = createSessionSchema.safeParse(payload);
      expect(result.success).toBe(true);
    });

    it('deve rejeitar sessão de corrida com distância negativa ou zero', () => {
      const payload = {
        sportKey: 'running',
        rpe: 6,
        metrics: {
          distanceMeters: 0,
          durationSeconds: 1800,
        },
      };

      const result = createSessionSchema.safeParse(payload);
      expect(result.success).toBe(false);
    });

    it('deve validar com sucesso uma sessão de Futebol (football)', () => {
      const payload = {
        sportKey: 'football',
        rpe: 8,
        metrics: {
          matchType: 'society_7',
          durationSeconds: 3600,
          goals: 2,
          assists: 1,
          position: 'meia',
          matchResult: 'win',
        },
      };

      const result = createSessionSchema.safeParse(payload);
      expect(result.success).toBe(true);
    });

    it('deve validar com sucesso uma sessão de Futevôlei (futevolei)', () => {
      const payload = {
        sportKey: 'futevolei',
        rpe: 7,
        metrics: {
          setsCount: 3,
          setsWon: 2,
          setsLost: 1,
          durationSeconds: 4200,
          partnerName: 'Romário',
          matches: [
            { setNumber: 1, pointsScored: 18, pointsConceded: 16 },
            { setNumber: 2, pointsScored: 15, pointsConceded: 18 },
            { setNumber: 3, pointsScored: 18, pointsConceded: 12 },
          ],
        },
      };

      const result = createSessionSchema.safeParse(payload);
      expect(result.success).toBe(true);
    });

    it('deve validar com sucesso uma sessão de Boxe (boxing)', () => {
      const payload = {
        sportKey: 'boxing',
        rpe: 9,
        metrics: {
          roundsCount: 8,
          roundDurationSeconds: 180,
          restDurationSeconds: 60,
          sparring: true,
          focusArea: 'sparring',
        },
      };

      const result = createSessionSchema.safeParse(payload);
      expect(result.success).toBe(true);
    });

    it('deve validar com sucesso uma sessão de Musculação (strength)', () => {
      const payload = {
        sportKey: 'strength',
        rpe: 8,
        metrics: {
          durationSeconds: 4500,
          exercises: [
            {
              exerciseName: 'Agachamento',
              targetMuscleGroup: 'Quadríceps',
              sets: [
                { setNumber: 1, reps: 10, weightKg: 80, isWarmup: false },
                { setNumber: 2, reps: 8, weightKg: 100, isWarmup: false },
              ],
            },
          ],
        },
      };

      const result = createSessionSchema.safeParse(payload);
      expect(result.success).toBe(true);
    });

    it('deve rejeitar esporte inválido', () => {
      const payload = {
        sportKey: 'swimming', // Esporte não pertencente aos 5 oficiais
        rpe: 5,
        metrics: {},
      };

      const result = createSessionSchema.safeParse(payload);
      expect(result.success).toBe(false);
    });

    it('deve rejeitar RPE fora da escala Borg CR10 (1 a 10)', () => {
      const payload = {
        sportKey: 'running',
        rpe: 15, // Acima de 10
        metrics: {
          distanceMeters: 5000,
          durationSeconds: 1500,
        },
      };

      const result = createSessionSchema.safeParse(payload);
      expect(result.success).toBe(false);
    });
  });

  describe('listSessionsQuerySchema', () => {
    it('deve aplicar defaults de paginação (page=1, limit=20)', () => {
      const result = listSessionsQuerySchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(1);
        expect(result.data.limit).toBe(20);
      }
    });

    it('deve aceitar filtro por sportKey oficial', () => {
      const result = listSessionsQuerySchema.safeParse({
        sportKey: 'boxing',
        limit: '10',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.sportKey).toBe('boxing');
        expect(result.data.limit).toBe(10);
      }
    });
  });

  describe('exerciseSearchQuerySchema', () => {
    it('deve aceitar limit=200 para carregamento do catálogo', () => {
      const result = exerciseSearchQuerySchema.safeParse({ limit: '200' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.limit).toBe(200);
      }
    });

    it('deve rejeitar limit superior a 1000', () => {
      const result = exerciseSearchQuerySchema.safeParse({ limit: '1001' });
      expect(result.success).toBe(false);
    });
  });
});
