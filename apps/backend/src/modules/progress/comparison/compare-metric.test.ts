import { describe, it, expect } from 'vitest';
import { compareMetric } from './compare-metric.js';

describe('compareMetric', () => {
  it('should correctly calculate improvement for higher_is_better', () => {
    const result = compareMetric(
      'distanceMeters',
      'Distância',
      'm',
      'higher_is_better',
      1000,
      800
    );
    expect(result).not.toBeNull();
    expect(result.status).toBe('improved');
    expect(result.relativeChangePercent).toBe(25); // (1000 - 800) / 800 = 25%
  });

  it('should correctly calculate improvement for lower_is_better', () => {
    const result = compareMetric(
      'paceSecondsPerKm',
      'Pace',
      's/km',
      'lower_is_better',
      300,
      330
    );
    expect(result).not.toBeNull();
    expect(result.status).toBe('improved');
    // Drop in pace from 330 to 300 is an improvement of 9.09% ((330 - 300) / 330)
    expect(result.relativeChangePercent).toBeCloseTo(9.1);
  });

  it('should return neutral for neutral metric regardless of variation', () => {
    const result = compareMetric(
      'totalVolumeKg',
      'Volume',
      'kg',
      'neutral',
      2000,
      1000
    );
    expect(result).not.toBeNull();
    // Variation is large (>2%), but status must be changed because it's a neutral metric
    expect(result.status).toBe('changed');
    expect(result.relativeChangePercent).toBe(100);
  });
});
