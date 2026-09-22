import { describe, it, expect } from 'vitest';
import { z } from 'zod';

import { getValidGeminiModel, aiProgressInsightSchema } from './insight.service.js';

describe('AI Insight Zod Schema', () => {
  it('should accept valid JSON payload with string values', () => {
    const validData = {
      headline: 'Consistência no Boxe',
      summary: 'Você aumentou seu volume de treino sem perder rendimento.',
      topProgress: [
        {
          sportKey: 'boxing',
          metric: 'Rounds',
          currentValue: '12 rounds',
          previousValue: '10 rounds',
          variation: '+20%',
          description: 'Aumento de 10% nos rounds'
        }
      ]
    };

    const parsed = aiProgressInsightSchema.parse(validData);
    expect(parsed.headline).toBe('Consistência no Boxe');
    expect(parsed.topProgress[0].currentValue).toBe('12 rounds');
  });

  it('should transform numeric metrics into strings gracefully', () => {
    const dataWithNumbers = {
      headline: 'Evolução de Cargas',
      summary: 'Seu volume de agachamento cresceu.',
      topProgress: [
        {
          sportKey: 'strength',
          metric: 'Volume Total',
          currentValue: 12000,
          previousValue: 10500,
          variation: 14.2,
          loadNote: 350,
          description: 'Progressão constante de carga.'
        }
      ]
    };

    const parsed = aiProgressInsightSchema.parse(dataWithNumbers);
    expect(parsed.topProgress[0].currentValue).toBe('12000');
    expect(parsed.topProgress[0].previousValue).toBe('10500');
    expect(parsed.topProgress[0].variation).toBe('14.2');
    expect(parsed.topProgress[0].loadNote).toBe('350');
  });

  it('should throw on missing required fields', () => {
    const invalidData = {
      headline: 'Consistência no Boxe',
      // summary missing
      topProgress: []
    };

    expect(() => aiProgressInsightSchema.parse(invalidData)).toThrow();
  });
});

describe('getValidGeminiModel', () => {
  it('should map invalid or hallucinated model aliases to gemini-flash-latest', () => {
    expect(getValidGeminiModel('gemini-3.5-flash')).toBe('gemini-flash-latest');
    expect(getValidGeminiModel('gemini-3-flash')).toBe('gemini-flash-latest');
    expect(getValidGeminiModel(undefined)).toBe('gemini-flash-latest');
    expect(getValidGeminiModel('')).toBe('gemini-flash-latest');
  });

  it('should preserve valid model names and latest alias', () => {
    expect(getValidGeminiModel('gemini-flash-latest')).toBe('gemini-flash-latest');
    expect(getValidGeminiModel('gemini-2.5-flash')).toBe('gemini-2.5-flash');
    expect(getValidGeminiModel('gemini-2.0-flash')).toBe('gemini-2.0-flash');
  });
});

describe('Strength Session Muscle Group Matching', () => {
  it('deve identificar corretamente os grupos musculares de membros inferiores', async () => {
    const { insightService } = await import('./insight.service.js');
    const session = {
      exercises: [
        { primaryMuscleGroup: 'quadriceps' },
        { primaryMuscleGroup: 'posteriores' },
        { primaryMuscleGroup: 'panturrilhas' },
      ],
    };

    const result = (insightService as any).getMuscleGroupsFromSession(session);
    expect(result.groups).toEqual(expect.arrayContaining(['quadriceps', 'posteriores', 'panturrilhas']));
    expect(result.label).toContain('Pernas / Membros Inferiores');
  });

  it('deve identificar corretamente os grupos musculares de empurrar/peito', async () => {
    const { insightService } = await import('./insight.service.js');
    const session = {
      exercises: [
        { primaryMuscleGroup: 'peito' },
        { primaryMuscleGroup: 'triceps' },
      ],
    };

    const result = (insightService as any).getMuscleGroupsFromSession(session);
    expect(result.groups).toEqual(expect.arrayContaining(['peito', 'triceps']));
    expect(result.label).toContain('Superiores / Empurrar');
  });
});
