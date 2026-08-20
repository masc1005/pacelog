import { describe, it, expect } from 'vitest';
import { scopedFilter } from '../../src/utils/scopedQuery.js';

describe('scopedFilter Unit Tests', () => {
  const userId = 'user_123456';

  it('deve injetar userId em um filtro vazio', () => {
    const filter = scopedFilter(userId);
    expect(filter).toEqual({ userId: 'user_123456' });
  });

  it('deve preservar os filtros de consulta existentes e anexar userId', () => {
    const filter = scopedFilter(userId, { sportKey: 'running', deletedAt: null });
    expect(filter).toEqual({
      userId: 'user_123456',
      sportKey: 'running',
      deletedAt: null,
    });
  });

  it('deve sobrescrever qualquer tentativa de forjar outro userId no filtro', () => {
    const filter = scopedFilter(userId, { userId: 'attacker_user_id', sportKey: 'boxing' });
    expect(filter.userId).toBe('user_123456');
  });

  it('deve lançar erro se o userId não for fornecido', () => {
    expect(() => scopedFilter('')).toThrow('scopedFilter: userId é obrigatório');
  });
});
