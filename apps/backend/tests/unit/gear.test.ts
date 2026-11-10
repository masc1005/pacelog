import { describe, it, expect } from 'vitest';
import {
  getGearImpact,
  getGearUsage,
  getGearComponentUsage,
  getGearCategoriesForSession,
} from '@pacelog/shared';
import { computeGearUsageDeltas } from '../../src/modules/gear/gear.usage.js';

const baseGear = {
  accumulatedDistanceKm: 0,
  accumulatedRounds: 0,
  accumulatedSessions: 0,
};

describe('getGearImpact', () => {
  it('corrida: usa gearId e converte metros em km', () => {
    expect(getGearImpact('running', { gearId: 'a', distanceMeters: 5000 })).toEqual({
      gearId: 'a',
      km: 5,
      sessions: 1,
      rounds: 0,
    });
  });

  it('corrida: cai no shoeId legado quando não há gearId', () => {
    expect(getGearImpact('running', { shoeId: 'legacy', distanceMeters: 10000 })?.gearId).toBe('legacy');
  });

  it('gearId null vence o legado (significa "sem equipamento")', () => {
    expect(getGearImpact('running', { gearId: null, shoeId: 'legacy', distanceMeters: 10000 })).toBeNull();
  });

  it('ciclismo: usa distanceKm e aceita bikeId legado', () => {
    expect(getGearImpact('cycling', { bikeId: 'b', distanceKm: 42.5 })).toEqual({
      gearId: 'b',
      km: 42.5,
      sessions: 1,
      rounds: 0,
    });
  });

  it('boxe: soma rounds', () => {
    expect(getGearImpact('boxing', { gearId: 'g', roundsCount: 8 })).toEqual({
      gearId: 'g',
      km: 0,
      sessions: 1,
      rounds: 8,
    });
  });

  it('jiu-jitsu: conta 1 treino', () => {
    expect(getGearImpact('jiujitsu', { gearId: 'k' })).toEqual({
      gearId: 'k',
      km: 0,
      sessions: 1,
      rounds: 0,
    });
  });

  it('esportes sem equipamento ou sem vínculo retornam null', () => {
    expect(getGearImpact('football', { gearId: 'x' })).toBeNull();
    expect(getGearImpact('running', { distanceMeters: 5000 })).toBeNull();
    expect(getGearImpact('running', null)).toBeNull();
  });
});

describe('computeGearUsageDeltas', () => {
  const run = (id: string, km: number) => ({ gearId: id, km, sessions: 1, rounds: 0 });

  it('criação soma o impacto', () => {
    expect(computeGearUsageDeltas(null, run('a', 5))).toEqual([run('a', 5)]);
  });

  it('exclusão devolve o uso', () => {
    expect(computeGearUsageDeltas(run('a', 5), null)).toEqual([
      { gearId: 'a', km: -5, sessions: -1, rounds: 0 },
    ]);
  });

  it('mesmo equipamento com distância alterada aplica só a diferença', () => {
    expect(computeGearUsageDeltas(run('a', 5), run('a', 8.1))).toEqual([
      { gearId: 'a', km: 3.1, sessions: 0, rounds: 0 },
    ]);
  });

  it('mesmo equipamento sem alteração não gera escrita', () => {
    expect(computeGearUsageDeltas(run('a', 5), run('a', 5))).toEqual([]);
  });

  it('troca de equipamento devolve ao antigo e soma no novo', () => {
    const deltas = computeGearUsageDeltas(run('a', 5), run('b', 5));
    expect(deltas).toHaveLength(2);
    expect(deltas).toContainEqual({ gearId: 'a', km: -5, sessions: -1, rounds: 0 });
    expect(deltas).toContainEqual({ gearId: 'b', km: 5, sessions: 1, rounds: 0 });
  });

  it('sem impacto nos dois lados não faz nada', () => {
    expect(computeGearUsageDeltas(null, null)).toEqual([]);
  });

  it('boxe: diferença de rounds', () => {
    const prev = { gearId: 'g', km: 0, sessions: 1, rounds: 6 };
    const next = { gearId: 'g', km: 0, sessions: 1, rounds: 10 };
    expect(computeGearUsageDeltas(prev, next)).toEqual([
      { gearId: 'g', km: 0, sessions: 0, rounds: 4 },
    ]);
  });
});

describe('getGearUsage', () => {
  it('tênis: km com limite', () => {
    const u = getGearUsage({ ...baseGear, category: 'running_shoe', accumulatedDistanceKm: 400, distanceLimitKm: 800 });
    expect(u).toMatchObject({ unit: 'km', used: 400, limit: 800, remaining: 400, percent: 50, status: 'normal' });
  });

  it('luvas: rounds, perto do limite', () => {
    const u = getGearUsage({ ...baseGear, category: 'boxing_gloves', accumulatedRounds: 800, roundsLimit: 1000 });
    expect(u).toMatchObject({ unit: 'rounds', status: 'near_limit' });
  });

  it('kimono: treinos, estourou o limite', () => {
    const u = getGearUsage({ ...baseGear, category: 'jiujitsu_gi', accumulatedSessions: 160, sessionsLimit: 150 });
    expect(u).toMatchObject({ unit: 'sessions', status: 'over_limit', remaining: 0 });
  });

  it('bike sem limite é ilimitada', () => {
    const u = getGearUsage({ ...baseGear, category: 'bike', accumulatedDistanceKm: 1200 });
    expect(u).toMatchObject({ unit: 'km', status: 'unlimited', percent: null });
  });
});

describe('getGearComponentUsage', () => {
  it('calcula km desde a instalação do componente', () => {
    const u = getGearComponentUsage({ accumulatedDistanceKm: 2500 }, { installedAtKm: 1000, distanceLimitKm: 3000 });
    expect(u).toMatchObject({ used: 1500, limit: 3000, percent: 50 });
  });
});

describe('getGearCategoriesForSession', () => {
  it('mapeia esporte para categoria', () => {
    expect(getGearCategoriesForSession('running')).toEqual(['running_shoe']);
    expect(getGearCategoriesForSession('boxing')).toEqual(['boxing_gloves']);
    expect(getGearCategoriesForSession('cycling')).toEqual(['bike']);
    expect(getGearCategoriesForSession('strength')).toEqual([]);
  });

  it('jiu-jitsu depende de gi/no-gi', () => {
    expect(getGearCategoriesForSession('jiujitsu', { gi: true })).toEqual(['jiujitsu_gi']);
    expect(getGearCategoriesForSession('jiujitsu', { gi: false })).toEqual(['rashguard']);
    expect(getGearCategoriesForSession('jiujitsu')).toEqual(['jiujitsu_gi']);
  });
});
