import { describe, it, expect } from 'vitest';
import {
  enrichJiuJitsuMetrics,
  computePrimaryMetric,
} from '../../src/modules/sessions/sport.rules.js';
import { compareJiuJitsu } from '../../src/modules/progress/comparison/compare-jiujitsu.js';
import { createJiuJitsuSessionSchema } from '../../src/modules/sessions/session.schemas.js';

describe('Jiu-Jitsu Rules and Metrics Unit Tests', () => {
  it('enrichJiuJitsuMetrics deve garantir durationSeconds e valores numéricos', () => {
    const input = {
      trainingType: 'sparring',
      roundsCount: '6',
      submissionsLanded: '3',
      submissionsReceived: '1',
      gi: false,
    };

    const enriched = enrichJiuJitsuMetrics(input, 3600);
    expect(enriched.durationSeconds).toBe(3600);
    expect(enriched.roundsCount).toBe(6);
    expect(enriched.submissionsLanded).toBe(3);
    expect(enriched.submissionsReceived).toBe(1);
    expect(enriched.gi).toBe(false);
  });

  it('computePrimaryMetric deve retornar roundsCount com direction higher_is_better', () => {
    const primary = computePrimaryMetric('jiujitsu', { roundsCount: 8 }, 3600);
    expect(primary).not.toBeNull();
    expect(primary?.key).toBe('roundsCount');
    expect(primary?.value).toBe(8);
    expect(primary?.unit).toBe('rolas');
    expect(primary?.direction).toBe('higher_is_better');
  });

  it('compareJiuJitsu deve indicar melhora quando volume de rolas sobe', () => {
    const currentSessions = [
      { metrics: { roundsCount: 8, submissionsLanded: 4 }, durationSeconds: 3600 },
      { metrics: { roundsCount: 7, submissionsLanded: 3 }, durationSeconds: 3600 },
      { metrics: { roundsCount: 9, submissionsLanded: 5 }, durationSeconds: 3600 },
    ] as any;

    const baselineSessions = [
      { metrics: { roundsCount: 4, submissionsLanded: 2 }, durationSeconds: 3600 },
      { metrics: { roundsCount: 5, submissionsLanded: 2 }, durationSeconds: 3600 },
      { metrics: { roundsCount: 4, submissionsLanded: 1 }, durationSeconds: 3600 },
    ] as any;

    const result = compareJiuJitsu(currentSessions, baselineSessions);
    expect(result.primaryMetric).not.toBeNull();
    expect(result.primaryMetric?.status).toBe('improved');
    expect(result.evidence.length).toBeGreaterThan(0);
  });

  it('createJiuJitsuSessionSchema deve validar sessão técnica e sessão com rolas', () => {
    const techSession = {
      sportKey: 'jiujitsu',
      startedAt: new Date(),
      rpe: 6,
      metrics: {
        trainingType: 'technique',
        gi: true,
        techniquesFocus: ['Passagem de guarda', 'Armlock da montada'],
      },
    };
    const parsedTech = createJiuJitsuSessionSchema.safeParse(techSession);
    expect(parsedTech.success).toBe(true);

    const sparringSession = {
      sportKey: 'jiujitsu',
      startedAt: new Date(),
      rpe: 9,
      metrics: {
        trainingType: 'sparring',
        gi: false,
        roundsCount: 7,
        averageRoundDurationSeconds: 360,
        submissionsLanded: 3,
        submissionsReceived: 2,
        beltRank: 'purple',
        beltDegree: 2,
      },
    };
    const parsedSparring = createJiuJitsuSessionSchema.safeParse(sparringSession);
    expect(parsedSparring.success).toBe(true);
  });
});
