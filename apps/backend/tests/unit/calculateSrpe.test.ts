import { describe, it, expect } from 'vitest';
import {
  calculateSrpeLoad,
  calculateSrpeLoadSafe,
  SRPE_CALCULATION_VERSION,
} from '../../src/modules/progress/load/calculate-srpe.js';
import { InvalidRpeError, InvalidDurationError } from '../../src/modules/progress/load/load.errors.js';
import { buildSessionLoad } from '../../src/modules/progress/load/load.service.js';

// ==========================================
// CASOS OBRIGATÓRIOS DO PLANO
// Todos os casos devem passar antes de qualquer deploy.
// ==========================================

describe('calculateSrpeLoad', () => {
  it('RPE 5 × 60 minutos = 300 AU', () => {
    expect(calculateSrpeLoad(5, 3600)).toBe(300);
  });

  it('RPE 8 × 45 minutos = 360 AU', () => {
    expect(calculateSrpeLoad(8, 2700)).toBe(360);
  });

  it('RPE 1 × 1 minuto = 1 AU (mínimo)', () => {
    expect(calculateSrpeLoad(1, 60)).toBe(1);
  });

  it('RPE 10 × 120 minutos = 1200 AU', () => {
    expect(calculateSrpeLoad(10, 7200)).toBe(1200);
  });

  it('arredonda resultado para inteiro', () => {
    // RPE 7 × 10 minutos = 70 AU
    expect(calculateSrpeLoad(7, 600)).toBe(70);
  });

  it('lança InvalidRpeError para RPE abaixo de 1', () => {
    expect(() => calculateSrpeLoad(0, 3600)).toThrow(InvalidRpeError);
  });

  it('lança InvalidRpeError para RPE acima de 10', () => {
    expect(() => calculateSrpeLoad(11, 3600)).toThrow(InvalidRpeError);
  });

  it('lança InvalidRpeError para RPE não inteiro', () => {
    expect(() => calculateSrpeLoad(7.5, 3600)).toThrow(InvalidRpeError);
  });

  it('lança InvalidDurationError para duração zero', () => {
    expect(() => calculateSrpeLoad(5, 0)).toThrow(InvalidDurationError);
  });

  it('lança InvalidDurationError para duração negativa', () => {
    expect(() => calculateSrpeLoad(5, -100)).toThrow(InvalidDurationError);
  });

  it('lança InvalidDurationError para duração acima de 24h', () => {
    expect(() => calculateSrpeLoad(5, 86401)).toThrow(InvalidDurationError);
  });

  it('duração máxima exata (86400s = 24h) é válida', () => {
    expect(calculateSrpeLoad(1, 86400)).toBe(1440);
  });

  it('versão da fórmula é 1', () => {
    expect(SRPE_CALCULATION_VERSION).toBe(1);
  });
});

describe('calculateSrpeLoadSafe', () => {
  it('retorna null para RPE undefined', () => {
    expect(calculateSrpeLoadSafe(undefined, 3600)).toBeNull();
  });

  it('retorna null para duração undefined', () => {
    expect(calculateSrpeLoadSafe(5, undefined)).toBeNull();
  });

  it('retorna null para RPE fora do range', () => {
    expect(calculateSrpeLoadSafe(0, 3600)).toBeNull();
    expect(calculateSrpeLoadSafe(11, 3600)).toBeNull();
  });

  it('retorna null para duração inválida', () => {
    expect(calculateSrpeLoadSafe(5, 0)).toBeNull();
  });

  it('retorna valor correto para inputs válidos', () => {
    expect(calculateSrpeLoadSafe(5, 3600)).toBe(300);
  });
});

// ==========================================
// COMPATIBILIDADE: sessionalLoad === load.srpe
// Garantia de que os dois campos nunca divergem.
// ==========================================

describe('buildSessionLoad — compatibilidade sessionalLoad / load.srpe', () => {
  it('sessionalLoad e load.srpe têm o mesmo valor para sessão completed', () => {
    const result = buildSessionLoad(5, 3600, 'completed');
    expect(result.sessionalLoad).toBe(300);
    expect(result.load?.srpe).toBe(300);
    expect(result.sessionalLoad).toBe(result.load?.srpe);
  });

  it('RPE 8 × 45 min: ambos os campos = 360', () => {
    const result = buildSessionLoad(8, 2700, 'completed');
    expect(result.sessionalLoad).toBe(360);
    expect(result.load?.srpe).toBe(360);
  });

  it('retorna null em ambos os campos para sessão não concluída', () => {
    const result = buildSessionLoad(8, 3600, 'in_progress');
    expect(result.sessionalLoad).toBeNull();
    expect(result.load).toBeNull();
  });

  it('retorna null em ambos os campos para RPE undefined', () => {
    const result = buildSessionLoad(undefined, 3600, 'completed');
    expect(result.sessionalLoad).toBeNull();
    expect(result.load).toBeNull();
  });

  it('campo load inclui calculationVersion = 1', () => {
    const result = buildSessionLoad(5, 3600, 'completed');
    expect(result.load?.calculationVersion).toBe(SRPE_CALCULATION_VERSION);
  });

  it('campo load inclui durationMinutes correto', () => {
    const result = buildSessionLoad(5, 3600, 'completed');
    expect(result.load?.durationMinutes).toBe(60);
  });
});
