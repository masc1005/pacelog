import { describe, expect, it } from 'vitest';
import { CreateInjuryInputSchema, UpdateInjuryInputSchema } from '@pacelog/shared';

describe('Injury schemas', () => {
  it('validates a complete injury payload', () => {
    expect(CreateInjuryInputSchema.parse({
      region: 'joelho',
      side: 'right',
      severity: 6,
      category: 'joint_discomfort',
      notes: 'Desconforto ao agachar',
    }).severity).toBe(6);
  });

  it('rejects severity outside 1-10', () => {
    expect(() => CreateInjuryInputSchema.parse({
      region: 'ombro',
      side: 'left',
      severity: 11,
      category: 'other',
    })).toThrow();
  });

  it('validates status transitions and resolvedAt', () => {
    expect(UpdateInjuryInputSchema.parse({
      severity: 2,
      status: 'recovering',
      resolvedAt: null,
    })).toEqual({ severity: 2, status: 'recovering', resolvedAt: null });
  });
});
