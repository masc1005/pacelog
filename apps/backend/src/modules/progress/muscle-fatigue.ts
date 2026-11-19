import { applyFatigueDecay, classifyFatigue, type FatigueStatus } from './fatigue.js';
import { SPORT_MUSCLE_IMPACT } from '../sessions/sport.rules.js';
import { calculateSrpeLoadSafe } from './load/calculate-srpe.js';

export type FatigueRegionCategory = 'muscle' | 'joint';

export interface CanonicalFatigueRegionMeta {
  region: string;
  category: FatigueRegionCategory;
}

export const CANONICAL_FATIGUE_REGIONS: CanonicalFatigueRegionMeta[] = [
  // Grupos Musculares (12)
  { region: 'peito', category: 'muscle' },
  { region: 'costas', category: 'muscle' },
  { region: 'ombros', category: 'muscle' },
  { region: 'biceps', category: 'muscle' },
  { region: 'triceps', category: 'muscle' },
  { region: 'antebracos', category: 'muscle' },
  { region: 'quadriceps', category: 'muscle' },
  { region: 'posteriores', category: 'muscle' },
  { region: 'gluteos', category: 'muscle' },
  { region: 'panturrilhas', category: 'muscle' },
  { region: 'abdomen', category: 'muscle' },
  { region: 'lombar', category: 'muscle' },
  // Articulações (5)
  { region: 'joelhos', category: 'joint' },
  { region: 'quadris', category: 'joint' },
  { region: 'tornozelos', category: 'joint' },
  { region: 'cotovelos', category: 'joint' },
  { region: 'punhos', category: 'joint' },
];

const REGION_INDEX = new Map(
  CANONICAL_FATIGUE_REGIONS.map((item, idx) => [item.region, idx])
);

const REGION_CATEGORY_MAP = new Map<string, FatigueRegionCategory>(
  CANONICAL_FATIGUE_REGIONS.map((item) => [item.region, item.category])
);

const REGION_ALIASES: Record<string, string> = {
  core: 'abdomen',
  pegada: 'antebracos',
  posterior: 'posteriores',
  abdominais: 'abdomen',
};

export function normalizeFatigueRegion(region: string): string {
  const key = (region || '').trim().toLowerCase();
  return REGION_ALIASES[key] ?? key;
}

function getStrengthSynergistAndJointWeights(params: {
  exerciseKey: string;
  primaryGroup: string;
  exerciseType?: string;
}): Array<{ region: string; weight: number }> {
  const key = (params.exerciseKey || '').toLowerCase();
  const primary = normalizeFatigueRegion(params.primaryGroup);
  const isCompound = params.exerciseType === 'compound';
  const extras: Array<{ region: string; weight: number }> = [];

  if (primary === 'corpo_inteiro') {
    extras.push(
      { region: 'quadriceps', weight: 5 },
      { region: 'gluteos', weight: 5 },
      { region: 'posteriores', weight: 4 },
      { region: 'costas', weight: 4.5 },
      { region: 'ombros', weight: 4.5 },
      { region: 'abdomen', weight: 4 },
      { region: 'lombar', weight: 3.5 },
      { region: 'joelhos', weight: 3 },
      { region: 'quadris', weight: 3 },
      { region: 'cotovelos', weight: 2.5 }
    );
    return extras;
  }

  switch (primary) {
    case 'peito': {
      if (isCompound || /supino|flexao|paralelas/.test(key)) {
        extras.push(
          { region: 'ombros', weight: 4 },
          { region: 'triceps', weight: 4 },
          { region: 'cotovelos', weight: 3 },
          { region: 'punhos', weight: 2.5 }
        );
      } else {
        extras.push(
          { region: 'ombros', weight: 2.5 },
          { region: 'cotovelos', weight: 1.5 }
        );
      }
      break;
    }
    case 'costas': {
      if (/hiperextensao_lombar/.test(key)) {
        extras.push(
          { region: 'lombar', weight: 8 },
          { region: 'gluteos', weight: 3 },
          { region: 'quadris', weight: 3 }
        );
      } else if (/levantamento_terra|deadlift/.test(key)) {
        extras.push(
          { region: 'lombar', weight: 6 },
          { region: 'gluteos', weight: 4.5 },
          { region: 'posteriores', weight: 4.5 },
          { region: 'quadris', weight: 4 },
          { region: 'joelhos', weight: 3 },
          { region: 'antebracos', weight: 4 },
          { region: 'punhos', weight: 2 }
        );
      } else {
        extras.push(
          { region: 'biceps', weight: 4 },
          { region: 'antebracos', weight: 3.5 },
          { region: 'ombros', weight: 2.5 },
          { region: 'cotovelos', weight: 2.5 }
        );
        if (/curvada|cavalinho|serrote/.test(key)) {
          extras.push(
            { region: 'lombar', weight: 4 },
            { region: 'quadris', weight: 2.5 }
          );
        }
      }
      break;
    }
    case 'ombros': {
      if (isCompound || /desenvolvimento|militar|arnold|remada_alta/.test(key)) {
        extras.push(
          { region: 'triceps', weight: 3.5 },
          { region: 'cotovelos', weight: 2.5 },
          { region: 'punhos', weight: 2.5 }
        );
      } else {
        extras.push({ region: 'cotovelos', weight: 1.5 });
      }
      break;
    }
    case 'biceps': {
      extras.push(
        { region: 'antebracos', weight: 3.5 },
        { region: 'cotovelos', weight: 3 },
        { region: 'punhos', weight: 2.5 }
      );
      break;
    }
    case 'triceps': {
      extras.push(
        { region: 'cotovelos', weight: 3.5 },
        { region: 'punhos', weight: 2 }
      );
      if (/paralelas|supino_fechado/.test(key)) {
        extras.push(
          { region: 'ombros', weight: 3 },
          { region: 'peito', weight: 3 }
        );
      }
      break;
    }
    case 'quadriceps': {
      if (isCompound || /agachamento|leg_press|passada|avanco|afundo|bulgaro|hack/.test(key)) {
        extras.push(
          { region: 'gluteos', weight: 4.5 },
          { region: 'joelhos', weight: 4.5 },
          { region: 'quadris', weight: 3.5 },
          { region: 'tornozelos', weight: 2 }
        );
        if (/livre|barra|sumo|frontal|bulgaro/.test(key)) {
          extras.push({ region: 'lombar', weight: 3 });
        }
      } else {
        extras.push({ region: 'joelhos', weight: 3.5 });
      }
      break;
    }
    case 'posteriores': {
      if (isCompound || /stiff|rdl|good_morning/.test(key)) {
        extras.push(
          { region: 'gluteos', weight: 5 },
          { region: 'lombar', weight: 4.5 },
          { region: 'quadris', weight: 4 },
          { region: 'antebracos', weight: 2.5 },
          { region: 'joelhos', weight: 2 }
        );
      } else {
        extras.push({ region: 'joelhos', weight: 3 });
      }
      break;
    }
    case 'gluteos': {
      extras.push(
        { region: 'quadris', weight: 3.5 },
        { region: 'posteriores', weight: 3 }
      );
      if (/elevacao_pelvica/.test(key)) {
        extras.push({ region: 'lombar', weight: 2 });
      }
      break;
    }
    case 'panturrilhas': {
      extras.push({ region: 'tornozelos', weight: 4 });
      break;
    }
    case 'abdomen': {
      extras.push(
        { region: 'lombar', weight: 1.5 },
        { region: 'quadris', weight: 1.5 }
      );
      break;
    }
    default:
      break;
  }

  return extras;
}

export interface MuscleFatigueRegionDTO {
  region: string;
  category: FatigueRegionCategory;
  fatigueScore: number;
  recoveryPercent: number;
  status: FatigueStatus;
  sources: string[];
}

export function computeMuscleFatigueRegions(params: {
  strengthSessions: Array<{
    startedAt: Date | string;
    finishedAt?: Date | string;
    exercises?: Array<{
      exerciseKey: string;
      primaryMuscleGroup?: string;
      sets?: Array<{ status?: string }>;
    }>;
  }>;
  generalSessions: Array<{
    sportKey: string;
    startedAt: Date | string;
    durationSeconds?: number;
    rpe?: number;
    sessionalLoad?: number;
    load?: { srpe?: number } | null;
  }>;
  readinessEntries: Array<{
    soreRegions?: string[];
  }>;
  exerciseDefinitions: Array<{
    key: string;
    primaryMuscleGroup?: string;
    secondaryMuscleGroups?: string[];
    type?: string;
  }>;
  nowMs?: number;
}): MuscleFatigueRegionDTO[] {
  const now = params.nowMs ?? Date.now();
  const exerciseMap = new Map(
    params.exerciseDefinitions.map((exercise) => [exercise.key, exercise])
  );

  const scores = new Map<string, { score: number; sources: Set<string> }>();
  for (const canonical of CANONICAL_FATIGUE_REGIONS) {
    scores.set(canonical.region, { score: 0, sources: new Set<string>() });
  }

  const add = (rawRegion: string, points: number, source: string) => {
    const region = normalizeFatigueRegion(rawRegion);
    if (!region || region === 'corpo_inteiro' || region === 'mobilidade' || region === 'cardio') {
      return;
    }
    const current = scores.get(region) ?? { score: 0, sources: new Set<string>() };
    current.score += points;
    current.sources.add(source);
    scores.set(region, current);
  };

  const decay = (date: Date) =>
    applyFatigueDecay(1, (now - date.getTime()) / (60 * 60 * 1000));

  for (const session of params.strengthSessions) {
    const timestamp = new Date(session.finishedAt ?? session.startedAt);
    const factor = decay(timestamp);

    for (const exercise of session.exercises ?? []) {
      const completedSets = (exercise.sets ?? []).filter(
        (set) => set.status === 'completed'
      ).length;
      if (!completedSets) continue;

      const definition = exerciseMap.get(exercise.exerciseKey);
      const primary = normalizeFatigueRegion(
        definition?.primaryMuscleGroup ?? exercise.primaryMuscleGroup ?? 'corpo_inteiro'
      );

      // Evita somar duas vezes a mesma região dentro de um mesmo exercício
      const exerciseWeights = new Map<string, number>();
      const registerWeight = (region: string, weight: number) => {
        const normalized = normalizeFatigueRegion(region);
        const existing = exerciseWeights.get(normalized) ?? 0;
        if (weight > existing) {
          exerciseWeights.set(normalized, weight);
        }
      };

      if (primary !== 'corpo_inteiro') {
        registerWeight(primary, 12);
      }

      for (const sec of definition?.secondaryMuscleGroups ?? []) {
        registerWeight(sec, 5);
      }

      for (const extra of getStrengthSynergistAndJointWeights({
        exerciseKey: exercise.exerciseKey,
        primaryGroup: primary,
        exerciseType: definition?.type,
      })) {
        registerWeight(extra.region, extra.weight);
      }

      for (const [region, weight] of exerciseWeights.entries()) {
        add(region, completedSets * weight * factor, 'musculação');
      }
    }
  }

  for (const session of params.generalSessions) {
    const srpe =
      session.load?.srpe ??
      session.sessionalLoad ??
      calculateSrpeLoadSafe(session.rpe ?? 0, session.durationSeconds ?? 0) ??
      0;
    const factor = decay(new Date(session.startedAt));
    const seenForSession = new Set<string>();

    for (const rawRegion of SPORT_MUSCLE_IMPACT[session.sportKey] ?? []) {
      const normalized = normalizeFatigueRegion(rawRegion);
      if (seenForSession.has(normalized)) continue;
      seenForSession.add(normalized);
      add(normalized, Math.max(1, srpe / 10) * factor, session.sportKey);
    }
  }

  for (const entry of params.readinessEntries) {
    const seenForEntry = new Set<string>();
    for (const rawRegion of entry.soreRegions ?? []) {
      const normalized = normalizeFatigueRegion(rawRegion);
      if (seenForEntry.has(normalized)) continue;
      seenForEntry.add(normalized);
      add(normalized, 25, 'dor reportada');
    }
  }

  const regions: MuscleFatigueRegionDTO[] = Array.from(scores.entries()).map(
    ([region, value]) => {
      const fatigueScore = Math.min(100, Math.round(value.score));
      const recoveryPercent = Math.max(0, 100 - fatigueScore);
      return {
        region,
        category: REGION_CATEGORY_MAP.get(region) ?? 'muscle',
        fatigueScore,
        recoveryPercent,
        status: classifyFatigue(fatigueScore),
        sources: Array.from(value.sources),
      };
    }
  );

  return regions.sort((a, b) => {
    if (a.recoveryPercent !== b.recoveryPercent) {
      return a.recoveryPercent - b.recoveryPercent;
    }
    const idxA = REGION_INDEX.get(a.region) ?? 999;
    const idxB = REGION_INDEX.get(b.region) ?? 999;
    return idxA - idxB;
  });
}
