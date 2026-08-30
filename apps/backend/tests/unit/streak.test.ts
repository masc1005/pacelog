import { describe, it, expect } from 'vitest';
import { calculateActiveStreak } from '../../src/modules/progress/streak.service.js';

describe('calculateActiveStreak', () => {
  const refDate = new Date('2026-08-30T14:00:00.000Z');

  it('deve retornar 0 se a lista de datas estiver vazia', () => {
    expect(calculateActiveStreak([], refDate)).toBe(0);
  });

  it('deve retornar 1 para treino apenas hoje (30/08) com intervalo anterior', () => {
    const dates = [
      '2026-08-30T10:00:00.000Z',
      '2026-08-26T15:00:00.000Z',
      '2026-08-25T18:00:00.000Z',
    ];
    expect(calculateActiveStreak(dates, refDate)).toBe(1);
  });

  it('deve retornar 3 para treinos em 30/08, 29/08 e 28/08', () => {
    const dates = [
      '2026-08-30T10:00:00.000Z',
      '2026-08-29T10:00:00.000Z',
      '2026-08-28T10:00:00.000Z',
      '2026-08-25T10:00:00.000Z',
    ];
    expect(calculateActiveStreak(dates, refDate)).toBe(3);
  });

  it('deve manter o streak ativo se o último treino foi ontem (29/08) e hoje ainda não treinou', () => {
    const dates = [
      '2026-08-29T10:00:00.000Z',
      '2026-08-28T10:00:00.000Z',
      '2026-08-27T10:00:00.000Z',
    ];
    expect(calculateActiveStreak(dates, refDate)).toBe(3);
  });

  it('deve retornar 0 se o último treino foi há 2 ou mais dias (ex: 28/08 com ref em 30/08)', () => {
    const dates = [
      '2026-08-28T10:00:00.000Z',
      '2026-08-27T10:00:00.000Z',
      '2026-08-26T10:00:00.000Z',
    ];
    expect(calculateActiveStreak(dates, refDate)).toBe(0);
  });

  it('deve lidar com múltiplos treinos no mesmo dia sem duplicar a contagem', () => {
    const dates = [
      '2026-08-30T08:00:00.000Z',
      '2026-08-30T16:00:00.000Z',
      '2026-08-29T09:00:00.000Z',
      '2026-08-29T18:00:00.000Z',
    ];
    expect(calculateActiveStreak(dates, refDate)).toBe(2);
  });
});
