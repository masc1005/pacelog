import { describe, it, expect } from 'vitest';
import {
  calculateConfidence,
  calculateWeeklySrpeLoad,
  calculateFourWeekBaseline,
  calculateSportMetricBaseline,
  compareWithBaseline,
  classifyLoadVariation,
  buildLoadStatusLabel,
  buildLoadStatusMessage,
  LOAD_DISCLAIMER,
} from '../../src/modules/progress/baseline.service.js';

// ==========================================
// TESTES DE BASELINE E CONFIANÇA
// ==========================================

describe('calculateConfidence', () => {
  it('retorna "low" para menos de 3 sessões', () => {
    expect(calculateConfidence(2, 28)).toBe('low');
    expect(calculateConfidence(0, 28)).toBe('low');
  });

  it('retorna "low" para menos de 14 dias de histórico', () => {
    expect(calculateConfidence(5, 13)).toBe('low');
  });

  it('retorna "medium" para 3–7 sessões e ≥ 14 dias', () => {
    expect(calculateConfidence(3, 14)).toBe('medium');
    expect(calculateConfidence(7, 20)).toBe('medium');
  });

  it('retorna "high" para ≥ 8 sessões e ≥ 28 dias', () => {
    expect(calculateConfidence(8, 28)).toBe('high');
    expect(calculateConfidence(20, 60)).toBe('high');
  });
});

describe('calculateFourWeekBaseline', () => {
  it('retorna null para array vazio', () => {
    expect(calculateFourWeekBaseline([])).toBeNull();
  });

  it('calcula média das últimas 4 semanas', () => {
    const weeks = [
      { weekLabel: 'S1', startDate: new Date(), endDate: new Date(), totalSrpe: 200, sessionsCount: 3 },
      { weekLabel: 'S2', startDate: new Date(), endDate: new Date(), totalSrpe: 300, sessionsCount: 4 },
      { weekLabel: 'S3', startDate: new Date(), endDate: new Date(), totalSrpe: 400, sessionsCount: 5 },
      { weekLabel: 'S4', startDate: new Date(), endDate: new Date(), totalSrpe: 500, sessionsCount: 6 },
    ];
    // Média = (200+300+400+500)/4 = 350
    expect(calculateFourWeekBaseline(weeks)).toBe(350);
  });
});

describe('compareWithBaseline — direção de métricas', () => {
  const currentPeriod = { key: 'curr', start: '', end: '', label: '7 dias' };
  const baselinePeriod = { key: 'base', start: '', end: '', label: '4 semanas' };

  it('pace menor = melhora (lower_is_better)', () => {
    // Pace melhorou de 360 → 345 s/km
    const result = compareWithBaseline(345, 360, 'lower_is_better', 's/km', currentPeriod, baselinePeriod, 'medium');
    expect(result.relativeChangePercent).toBeGreaterThan(0); // melhora positiva
    expect(result.relativeChangePercent).toBeCloseTo(4.2, 0);
  });

  it('pace maior = piora (lower_is_better)', () => {
    const result = compareWithBaseline(380, 360, 'lower_is_better', 's/km', currentPeriod, baselinePeriod, 'medium');
    expect(result.relativeChangePercent).toBeLessThan(0);
  });

  it('volume maior = variação positiva (higher_is_better)', () => {
    const result = compareWithBaseline(8400, 7200, 'higher_is_better', 'kg', currentPeriod, baselinePeriod, 'medium');
    expect(result.relativeChangePercent).toBeGreaterThan(0);
    expect(result.relativeChangePercent).toBeCloseTo(16.7, 0);
  });

  it('informa unidade e período corretamente', () => {
    const result = compareWithBaseline(100, 80, 'higher_is_better', 'AU', currentPeriod, baselinePeriod, 'high');
    expect(result.unit).toBe('AU');
    expect(result.currentPeriod.label).toBe('7 dias');
    expect(result.baselinePeriod.label).toBe('4 semanas');
  });
});

describe('classifyLoadVariation', () => {
  it('retorna insufficient_data para confiança low', () => {
    expect(classifyLoadVariation(50, 'low')).toBe('insufficient_data');
  });

  it('retorna stable para variação ≤ 5%', () => {
    expect(classifyLoadVariation(3, 'medium')).toBe('stable');
    expect(classifyLoadVariation(-5, 'medium')).toBe('stable');
  });

  it('retorna elevated_vs_baseline para variação > 5%', () => {
    expect(classifyLoadVariation(29.6, 'medium')).toBe('elevated_vs_baseline');
  });

  it('retorna below_baseline para variação < -5%', () => {
    expect(classifyLoadVariation(-20, 'medium')).toBe('below_baseline');
  });
});

describe('linguagem não diagnóstica', () => {
  it('labels não contêm linguagem médica proibida', () => {
    const proibidos = ['danger_zone', 'risco', 'lesão', 'perigoso', 'overtraining', 'injury'];
    const statuses = ['baseline', 'elevated_vs_baseline', 'below_baseline', 'insufficient_data', 'stable'] as const;

    for (const status of statuses) {
      const label = buildLoadStatusLabel(status).toLowerCase();
      const message = buildLoadStatusMessage(status, 20, 'das últimas 4 semanas').toLowerCase();
      for (const termo of proibidos) {
        expect(label).not.toContain(termo);
        expect(message).not.toContain(termo);
      }
    }
  });

  it('disclaimer está presente e não está vazio', () => {
    expect(LOAD_DISCLAIMER).toBeTruthy();
    expect(LOAD_DISCLAIMER.length).toBeGreaterThan(20);
  });
});
