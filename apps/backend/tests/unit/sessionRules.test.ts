import { describe, it, expect } from 'vitest';
import {
  calculateSessionalLoad,
  calculateRunningPace,
  enrichRunningMetrics,
  enrichStrengthMetrics,
  enrichBoxingMetrics,
} from '../../src/modules/sessions/sport.rules.js';

describe('Sport Rules & Physiological Metrics Unit Tests', () => {
  describe('calculateSessionalLoad (Foster sRPE / TRIMP)', () => {
    it('deve calcular a carga da sessão como (duração em minutos * RPE)', () => {
      // 60 minutos com RPE 5 = 300
      expect(calculateSessionalLoad(3600, 5)).toBe(300);

      // 45 minutos com RPE 8 = 360
      expect(calculateSessionalLoad(2700, 8)).toBe(360);

      // 90 minutos com RPE 9 = 810
      expect(calculateSessionalLoad(5400, 9)).toBe(810);
    });

    it('deve retornar 0 para duração ou RPE zerados/inválidos', () => {
      expect(calculateSessionalLoad(0, 8)).toBe(0);
      expect(calculateSessionalLoad(3600, 0)).toBe(0);
      expect(calculateSessionalLoad(-100, 5)).toBe(0);
    });
  });

  describe('calculateRunningPace & enrichRunningMetrics', () => {
    it('deve calcular o pace médio em segundos por km com precisão', () => {
      // 10km (10000m) em 50 minutos (3000s) = 300s/km (5:00 min/km)
      expect(calculateRunningPace(10000, 3000)).toBe(300);

      // 5km (5000m) em 20 minutos (1200s) = 240s/km (4:00 min/km)
      expect(calculateRunningPace(5000, 1200)).toBe(240);
    });

    it('deve enriquecer métricas de corrida preenchendo pace se omitido', () => {
      const enriched = enrichRunningMetrics({
        distanceMeters: 5000,
        durationSeconds: 1500, // 25 min -> 300s/km
      });

      expect(enriched.paceSecondsPerKm).toBe(300);
    });

    it('deve preservar pace existente se explicitamente fornecido', () => {
      const enriched = enrichRunningMetrics({
        distanceMeters: 5000,
        durationSeconds: 1500,
        paceSecondsPerKm: 295,
      });

      expect(enriched.paceSecondsPerKm).toBe(295);
    });
  });

  describe('enrichStrengthMetrics (Volume Total em kg & Séries)', () => {
    it('deve calcular o volume total em kg somando (reps * carga) apenas de séries válidas', () => {
      const metrics = enrichStrengthMetrics({
        durationSeconds: 3600,
        exercises: [
          {
            exerciseName: 'Supino Reto',
            targetMuscleGroup: 'Peito',
            sets: [
              { setNumber: 1, reps: 10, weightKg: 20, isWarmup: true }, // Aquecimento: não entra no volume
              { setNumber: 2, reps: 10, weightKg: 80, isWarmup: false }, // 800 kg
              { setNumber: 3, reps: 8, weightKg: 90, isWarmup: false }, // 720 kg
              { setNumber: 4, reps: 6, weightKg: 100, isWarmup: false }, // 600 kg
            ],
          },
          {
            exerciseName: 'Agachamento Livre',
            targetMuscleGroup: 'Pernas',
            sets: [
              { setNumber: 1, reps: 8, weightKg: 120, isWarmup: false }, // 960 kg
              { setNumber: 2, reps: 8, weightKg: 120, isWarmup: false }, // 960 kg
            ],
          },
        ],
      });

      // Volume esperado: 800 + 720 + 600 + 960 + 960 = 4040 kg
      expect(metrics.totalVolumeKg).toBe(4040);
      expect(metrics.totalSets).toBe(6);
      expect(metrics.totalReps).toBe(50);
    });
  });

  describe('enrichBoxingMetrics (Duração de Rounds e Descanso)', () => {
    it('deve calcular a duração total do treino de boxe a partir dos rounds e intervalos', () => {
      const metrics = enrichBoxingMetrics({
        roundsCount: 5,
        roundDurationSeconds: 180, // 3 min cada = 900s
        restDurationSeconds: 60, // 1 min descanso (4 intervalos entre 5 rounds = 240s)
        totalDurationSeconds: 0,
      });

      // Total: 900s + 240s = 1140s (19 minutos)
      expect(metrics.totalDurationSeconds).toBe(1140);
      expect(metrics.roundsCount).toBe(5);
    });
  });
});
