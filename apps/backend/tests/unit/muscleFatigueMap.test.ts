import { describe, it, expect } from 'vitest';
import {
  CANONICAL_FATIGUE_REGIONS,
  computeMuscleFatigueRegions,
  normalizeFatigueRegion,
} from '../../src/modules/progress/muscle-fatigue.js';

const NOW_MS = new Date('2026-11-19T12:00:00.000Z').getTime();
const hoursAgoMs = (h: number) => new Date(NOW_MS - h * 60 * 60 * 1000);

describe('Muscle & Joint Fatigue Map (72h)', () => {
  it('retorna todos os 12 grupos musculares e 5 articulações com 100% recup. quando não há sessões recentes', () => {
    const regions = computeMuscleFatigueRegions({
      strengthSessions: [],
      generalSessions: [],
      readinessEntries: [],
      exerciseDefinitions: [],
      nowMs: NOW_MS,
    });

    expect(regions).toHaveLength(CANONICAL_FATIGUE_REGIONS.length);
    const muscles = regions.filter((r) => r.category === 'muscle');
    const joints = regions.filter((r) => r.category === 'joint');

    expect(muscles).toHaveLength(12);
    expect(joints).toHaveLength(5);

    expect(muscles.map((m) => m.region)).toEqual(
      expect.arrayContaining([
        'peito',
        'costas',
        'ombros',
        'biceps',
        'triceps',
        'antebracos',
        'quadriceps',
        'posteriores',
        'gluteos',
        'panturrilhas',
        'abdomen',
        'lombar',
      ])
    );
    expect(joints.map((j) => j.region)).toEqual(
      expect.arrayContaining(['joelhos', 'quadris', 'tornozelos', 'cotovelos', 'punhos'])
    );

    for (const region of regions) {
      expect(region.fatigueScore).toBe(0);
      expect(region.recoveryPercent).toBe(100);
      expect(region.status).toBe('fresh');
    }
  });

  it('propaga fadiga para sinergistas e articulações em exercícios compostos de musculação', () => {
    const regions = computeMuscleFatigueRegions({
      strengthSessions: [
        {
          startedAt: hoursAgoMs(4),
          finishedAt: hoursAgoMs(3),
          exercises: [
            {
              exerciseKey: 'supino_reto_barra',
              primaryMuscleGroup: 'peito',
              sets: [
                { status: 'completed' },
                { status: 'completed' },
                { status: 'completed' },
                { status: 'completed' },
              ],
            },
            {
              exerciseKey: 'agachamento_livre',
              primaryMuscleGroup: 'quadriceps',
              sets: [
                { status: 'completed' },
                { status: 'completed' },
                { status: 'completed' },
                { status: 'completed' },
              ],
            },
          ],
        },
      ],
      generalSessions: [],
      readinessEntries: [],
      exerciseDefinitions: [
        { key: 'supino_reto_barra', primaryMuscleGroup: 'peito', secondaryMuscleGroups: [], type: 'compound' },
        { key: 'agachamento_livre', primaryMuscleGroup: 'quadriceps', secondaryMuscleGroups: [], type: 'compound' },
      ],
      nowMs: NOW_MS,
    });

    const byRegion = new Map(regions.map((r) => [r.region, r]));

    // Supino: peito + ombros + tríceps + cotovelos + punhos
    expect(byRegion.get('peito')!.fatigueScore).toBeGreaterThan(0);
    expect(byRegion.get('ombros')!.fatigueScore).toBeGreaterThan(0);
    expect(byRegion.get('triceps')!.fatigueScore).toBeGreaterThan(0);
    expect(byRegion.get('cotovelos')!.fatigueScore).toBeGreaterThan(0);
    expect(byRegion.get('punhos')!.fatigueScore).toBeGreaterThan(0);

    // Agachamento livre: quadríceps + glúteos + joelhos + quadris + tornozelos + lombar
    expect(byRegion.get('quadriceps')!.fatigueScore).toBeGreaterThan(0);
    expect(byRegion.get('gluteos')!.fatigueScore).toBeGreaterThan(0);
    expect(byRegion.get('joelhos')!.fatigueScore).toBeGreaterThan(0);
    expect(byRegion.get('quadris')!.fatigueScore).toBeGreaterThan(0);
    expect(byRegion.get('tornozelos')!.fatigueScore).toBeGreaterThan(0);
    expect(byRegion.get('lombar')!.fatigueScore).toBeGreaterThan(0);
  });

  it('contabiliza impacto articular e muscular de modalidades multiesportivas', () => {
    const regions = computeMuscleFatigueRegions({
      strengthSessions: [],
      generalSessions: [
        {
          sportKey: 'running',
          startedAt: hoursAgoMs(10),
          durationSeconds: 3000,
          rpe: 7,
          sessionalLoad: 350,
        },
        {
          sportKey: 'boxing',
          startedAt: hoursAgoMs(12),
          durationSeconds: 3600,
          rpe: 8,
          sessionalLoad: 480,
        },
      ],
      readinessEntries: [],
      exerciseDefinitions: [],
      nowMs: NOW_MS,
    });

    const byRegion = new Map(regions.map((r) => [r.region, r]));

    expect(byRegion.get('joelhos')!.sources).toContain('running');
    expect(byRegion.get('tornozelos')!.sources).toContain('running');
    expect(byRegion.get('quadris')!.sources).toContain('running');
    expect(byRegion.get('gluteos')!.sources).toContain('running');

    expect(byRegion.get('cotovelos')!.sources).toContain('boxing');
    expect(byRegion.get('punhos')!.sources).toContain('boxing');
    expect(byRegion.get('antebracos')!.sources).toContain('boxing');
    expect(byRegion.get('abdomen')!.sources).toContain('boxing');
  });

  it('normaliza aliases (core -> abdomen, pegada -> antebracos, posterior -> posteriores) sem duplicar regiões', () => {
    expect(normalizeFatigueRegion('core')).toBe('abdomen');
    expect(normalizeFatigueRegion('pegada')).toBe('antebracos');
    expect(normalizeFatigueRegion('posterior')).toBe('posteriores');

    const regions = computeMuscleFatigueRegions({
      strengthSessions: [],
      generalSessions: [
        {
          sportKey: 'jiujitsu',
          startedAt: hoursAgoMs(6),
          durationSeconds: 3600,
          rpe: 8,
          sessionalLoad: 480,
        },
      ],
      readinessEntries: [
        {
          soreRegions: ['core', 'pegada', 'tornozelos', 'cotovelos'],
        },
      ],
      exerciseDefinitions: [],
      nowMs: NOW_MS,
    });

    const keys = regions.map((r) => r.region);
    expect(new Set(keys).size).toBe(keys.length);
    expect(keys).not.toContain('core');
    expect(keys).not.toContain('pegada');

    const byRegion = new Map(regions.map((r) => [r.region, r]));
    expect(byRegion.get('abdomen')!.sources).toEqual(expect.arrayContaining(['jiujitsu', 'dor reportada']));
    expect(byRegion.get('antebracos')!.sources).toEqual(expect.arrayContaining(['jiujitsu', 'dor reportada']));
    expect(byRegion.get('tornozelos')!.sources).toContain('dor reportada');
    expect(byRegion.get('cotovelos')!.sources).toContain('dor reportada');
  });
});
