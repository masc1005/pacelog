import { describe, it, expect } from 'vitest';
import { z } from 'zod';

const aiProgressInsightSchema = z.object({
  headline: z.string(),
  summary: z.string(),
  topProgress: z.array(z.object({
    sportKey: z.string(),
    metric: z.string(),
    description: z.string()
  }))
});

describe('AI Insight Zod Schema', () => {
  it('should accept valid JSON payload', () => {
    const validData = {
      headline: 'Consistência no Boxe',
      summary: 'Você aumentou seu volume de treino sem perder rendimento.',
      topProgress: [
        {
          sportKey: 'boxing',
          metric: 'Rounds',
          description: 'Aumento de 10% nos rounds'
        }
      ]
    };

    expect(() => aiProgressInsightSchema.parse(validData)).not.toThrow();
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
