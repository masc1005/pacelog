import { describe, it, expect } from 'vitest';
import { formatDuration, calculatePace, formatMetricNumber } from './utils.js';

describe('Frontend Sports Utilities Tests', () => {
  describe('formatDuration', () => {
    it('deve formatar segundos para MM:SS', () => {
      expect(formatDuration(125)).toBe('02:05');
      expect(formatDuration(59)).toBe('00:59');
    });

    it('deve formatar segundos para HH:MM:SS para durações longas', () => {
      expect(formatDuration(3665)).toBe('01:01:05');
      expect(formatDuration(7200)).toBe('02:00:00');
    });

    it('deve retornar 00:00 para valores inválidos ou zerados', () => {
      expect(formatDuration(0)).toBe('00:00');
      expect(formatDuration(-10)).toBe('00:00');
      expect(formatDuration(NaN)).toBe('00:00');
    });
  });

  describe('calculatePace', () => {
    it('deve calcular o pace correto em min/km', () => {
      // 10km em 50 minutos (3000s) = 5:00 min/km
      expect(calculatePace(10, 3000)).toBe('5:00');
      // 5km em 25min 30s (1530s) = 5:06 min/km
      expect(calculatePace(5, 1530)).toBe('5:06');
    });

    it('deve retornar --:-- quando os valores forem zerados ou inválidos', () => {
      expect(calculatePace(0, 1000)).toBe('--:--');
      expect(calculatePace(10, 0)).toBe('--:--');
    });
  });

  describe('formatMetricNumber', () => {
    it('deve formatar números e remover decimais desnecessários', () => {
      expect(formatMetricNumber(12.5)).toBe('12.50');
      expect(formatMetricNumber(10.0)).toBe('10');
      expect(formatMetricNumber(0)).toBe('0');
    });
  });
});
