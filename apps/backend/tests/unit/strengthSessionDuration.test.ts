import { describe, it, expect } from 'vitest';
import {
  finishSessionInputSchema,
  patchSessionInputSchema,
} from '@pacelog/shared';
import { buildSessionLoad } from '../../src/modules/progress/load/load.service.js';

describe('Strength Session Manual Duration & sRPE Recalculation', () => {
  describe('Schema Validation', () => {
    it('finishSessionInputSchema aceita durationMinutes válido', () => {
      const parsed = finishSessionInputSchema.safeParse({
        durationMinutes: 45,
        rpe: 8,
      });
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.durationMinutes).toBe(45);
        expect(parsed.data.rpe).toBe(8);
      }
    });

    it('finishSessionInputSchema rejeita durationMinutes negativo ou acima de 24h', () => {
      const negative = finishSessionInputSchema.safeParse({ durationMinutes: -10 });
      expect(negative.success).toBe(false);

      const tooLong = finishSessionInputSchema.safeParse({ durationMinutes: 1500 });
      expect(tooLong.success).toBe(false);
    });

    it('patchSessionInputSchema aceita durationMinutes, durationSeconds e rpe', () => {
      const parsed = patchSessionInputSchema.safeParse({
        durationMinutes: 50,
        rpe: 7,
      });
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.durationMinutes).toBe(50);
        expect(parsed.data.rpe).toBe(7);
      }
    });

    it('patchSessionInputSchema valida intervalo de RPE (1 a 10)', () => {
      expect(patchSessionInputSchema.safeParse({ rpe: 0 }).success).toBe(false);
      expect(patchSessionInputSchema.safeParse({ rpe: 11 }).success).toBe(false);
      expect(patchSessionInputSchema.safeParse({ rpe: 7 }).success).toBe(true);
    });
  });

  describe('sRPE Recalculation on Manual Duration Edit', () => {
    it('recalcula sRPE de 105 min (735 UA) para 45 min (315 UA) com RPE 7', () => {
      const rpe = 7;

      // Duração original calculada por tempo aberto (105 min = 6300s)
      const initialDurationSeconds = 105 * 60;
      const initialPayload = buildSessionLoad(rpe, initialDurationSeconds, 'completed');
      expect(initialPayload.load?.srpe).toBe(735);
      expect(initialPayload.sessionalLoad).toBe(735);

      // Usuário ajusta manualmente a duração para 45 min (2700s)
      const manualDurationMinutes = 45;
      const editedDurationSeconds = manualDurationMinutes * 60;
      const editedPayload = buildSessionLoad(rpe, editedDurationSeconds, 'completed');
      expect(editedPayload.load?.srpe).toBe(315);
      expect(editedPayload.sessionalLoad).toBe(315);
    });

    it('recalcula sRPE quando ambos RPE e duração são editados via patch', () => {
      // Treino de 60 min com RPE 6 = 360 UA
      const initial = buildSessionLoad(6, 3600, 'completed');
      expect(initial.load?.srpe).toBe(360);

      // Treino editado para 40 min com RPE 8 = 320 UA
      const updated = buildSessionLoad(8, 40 * 60, 'completed');
      expect(updated.load?.srpe).toBe(320);
    });
  });
});
