import { describe, it, expect } from 'vitest';
import { enrichCyclingMetrics, computePrimaryMetric } from '../../src/modules/sessions/sport.rules.js';
import { compareCycling } from '../../src/modules/progress/comparison/compare-cycling.js';
import { calculateCyclingSpeed, calculateCyclingPace } from '@pacelog/shared';

describe('Cycling Rules and Metrics Unit Tests', () => {
  it('calculateCyclingSpeed deve calcular velocidade média em km/h', () => {
    // 30 km em 3600 segundos (1h) = 30 km/h
    expect(calculateCyclingSpeed(30, 3600)).toBe(30);
    // 25 km em 3000 segundos (50 min) = 30 km/h
    expect(calculateCyclingSpeed(25, 3000)).toBe(30);
    // 15 km em 2700 segundos (45 min) = 20 km/h
    expect(calculateCyclingSpeed(15, 2700)).toBe(20);
  });

  it('calculateCyclingPace deve calcular pace em segundos por km', () => {
    // 10 km em 1800s (30 min) = 180 s/km (3:00/km)
    expect(calculateCyclingPace(10, 1800)).toBe(180);
  });

  it('enrichCyclingMetrics deve calcular averageSpeedKmh e paceSecondsPerKm automaticamente', () => {
    const inputMetrics = {
      cyclingType: 'road' as const,
      distanceKm: 40,
    };
    const enriched = enrichCyclingMetrics(inputMetrics, 4800); // 80 min = 4800s
    expect(enriched.averageSpeedKmh).toBe(30); // 40 / (4800/3600) = 30 km/h
    expect(enriched.paceSecondsPerKm).toBe(120); // 4800 / 40 = 120 s/km (2:00/km)
    expect(enriched.distanceKm).toBe(40);
  });

  it('computePrimaryMetric deve retornar averageSpeedKmh com direction higher_is_better', () => {
    const primary = computePrimaryMetric('cycling', { distanceKm: 30, averageSpeedKmh: 25 }, 4320);
    expect(primary).toEqual({
      key: 'averageSpeedKmh',
      label: 'Velocidade média',
      value: 25,
      unit: 'km/h',
      direction: 'higher_is_better',
      comparability: 'same_sport',
    });
  });

  it('compareCycling deve indicar melhora quando velocidade média sobe', () => {
    const currentSessions = [
      {
        sportKey: 'cycling',
        durationSeconds: 3600,
        metrics: { distanceKm: 28, averageSpeedKmh: 28 },
      },
    ] as any;

    const baselineSessions = [
      { sportKey: 'cycling', durationSeconds: 3600, metrics: { distanceKm: 24, averageSpeedKmh: 24 } },
      { sportKey: 'cycling', durationSeconds: 3600, metrics: { distanceKm: 24, averageSpeedKmh: 24 } },
      { sportKey: 'cycling', durationSeconds: 3600, metrics: { distanceKm: 24, averageSpeedKmh: 24 } },
    ] as any;

    const result = compareCycling(currentSessions, baselineSessions);
    expect(result.primaryMetric?.status).toBe('improved');
    expect(result.primaryMetric?.direction).toBe('higher_is_better');
    expect(result.evidence.length).toBeGreaterThan(0);
    expect(result.evidence[0]).toContain('subiu de 24 km/h para 28 km/h');
  });
});
