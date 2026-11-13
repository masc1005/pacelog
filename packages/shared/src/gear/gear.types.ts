export const GEAR_CATEGORIES = [
  'running_shoe',
  'boxing_gloves',
  'jiujitsu_gi',
  'rashguard',
  'bike',
] as const;
export type GearCategory = (typeof GEAR_CATEGORIES)[number];

export type GearStatus = 'active' | 'retired' | 'archived';

/** Unidade em que o desgaste de cada categoria é medido. */
export type GearUsageUnit = 'km' | 'rounds' | 'sessions';

/** Esporte (SportKey) que alimenta cada categoria. Mantido como string literal para não depender do index. */
export type GearSportKey = 'running' | 'boxing' | 'jiujitsu' | 'cycling';

export interface GearCategoryMeta {
  label: string;
  /** Rótulo no singular, usado em formulários ("Cadastrar {singular}"). */
  singular: string;
  sportKey: GearSportKey;
  usageUnit: GearUsageUnit;
  /** Sugestão inicial de vida útil exibida no formulário (sempre editável). */
  defaultLimit?: number;
  /** Se a categoria aceita componentes com desgaste próprio (corrente, pneus...). */
  supportsComponents: boolean;
}

export const GEAR_CATEGORY_META: Record<GearCategory, GearCategoryMeta> = {
  running_shoe: {
    label: 'Tênis de Corrida',
    singular: 'Tênis',
    sportKey: 'running',
    usageUnit: 'km',
    defaultLimit: 800,
    supportsComponents: false,
  },
  boxing_gloves: {
    label: 'Luvas de Boxe',
    singular: 'Luvas',
    sportKey: 'boxing',
    usageUnit: 'rounds',
    defaultLimit: 1000,
    supportsComponents: false,
  },
  jiujitsu_gi: {
    label: 'Kimonos',
    singular: 'Kimono',
    sportKey: 'jiujitsu',
    usageUnit: 'sessions',
    defaultLimit: 150,
    supportsComponents: false,
  },
  rashguard: {
    label: 'Rashguards',
    singular: 'Rashguard',
    sportKey: 'jiujitsu',
    usageUnit: 'sessions',
    defaultLimit: 150,
    supportsComponents: false,
  },
  bike: {
    label: 'Bicicletas',
    singular: 'Bicicleta',
    sportKey: 'cycling',
    usageUnit: 'km',
    supportsComponents: true,
  },
};

/** Componente de uma bicicleta (corrente, pneus...). O desgaste é derivado do km da bike. */
export type GearComponent = {
  id: string;
  name: string;
  /** Km acumulado da bike no momento em que o componente entrou em uso (pode ser negativo se já tinha uso prévio). */
  installedAtKm: number;
  distanceLimitKm?: number;
  installedAt?: string;
  /** Quantas vezes o componente já foi trocado. */
  replacements: number;
};

export type Gear = {
  id: string;
  userId: string;
  category: GearCategory;

  brand?: string;
  model: string;
  nickname?: string;
  color?: string;
  imageUrl?: string;

  purchaseDate?: string;
  startedUsingAt?: string;

  initialDistanceKm: number;
  accumulatedDistanceKm: number;
  distanceLimitKm?: number;

  accumulatedSessions: number;
  accumulatedRounds: number;
  sessionsLimit?: number;
  roundsLimit?: number;

  components: GearComponent[];

  status: GearStatus;
  /** Padrão dentro da própria categoria (um por categoria). */
  isDefault: boolean;

  createdAt: string;
  updatedAt: string;
};

export type GearUsageStatus = 'normal' | 'near_limit' | 'over_limit' | 'unlimited';

export type GearUsage = {
  unit: GearUsageUnit;
  used: number;
  limit: number | null;
  remaining: number | null;
  /** 0–100 (pode passar de 100 quando estourou o limite). null quando não há limite. */
  percent: number | null;
  status: GearUsageStatus;
};

const NEAR_LIMIT_PERCENT = 75;

function buildUsage(unit: GearUsageUnit, used: number, limit?: number | null): GearUsage {
  const safeUsed = Math.max(0, used);
  if (!limit || limit <= 0) {
    return { unit, used: safeUsed, limit: null, remaining: null, percent: null, status: 'unlimited' };
  }
  const percent = (safeUsed / limit) * 100;
  return {
    unit,
    used: safeUsed,
    limit,
    remaining: Math.max(0, limit - safeUsed),
    percent,
    status: percent >= 100 ? 'over_limit' : percent >= NEAR_LIMIT_PERCENT ? 'near_limit' : 'normal',
  };
}

/** Desgaste do equipamento na unidade da sua categoria (km, rounds ou treinos). */
export function getGearUsage(
  gear: Pick<
    Gear,
    | 'category'
    | 'accumulatedDistanceKm'
    | 'distanceLimitKm'
    | 'accumulatedRounds'
    | 'roundsLimit'
    | 'accumulatedSessions'
    | 'sessionsLimit'
  >
): GearUsage {
  const unit = GEAR_CATEGORY_META[gear.category]?.usageUnit ?? 'km';
  switch (unit) {
    case 'rounds':
      return buildUsage('rounds', gear.accumulatedRounds ?? 0, gear.roundsLimit);
    case 'sessions':
      return buildUsage('sessions', gear.accumulatedSessions ?? 0, gear.sessionsLimit);
    case 'km':
    default:
      return buildUsage('km', gear.accumulatedDistanceKm ?? 0, gear.distanceLimitKm);
  }
}

/** Desgaste de um componente: km rodados pela bike desde que o componente entrou em uso. */
export function getGearComponentUsage(
  gear: Pick<Gear, 'accumulatedDistanceKm'>,
  component: Pick<GearComponent, 'installedAtKm' | 'distanceLimitKm'>
): GearUsage {
  return buildUsage(
    'km',
    (gear.accumulatedDistanceKm ?? 0) - (component.installedAtKm ?? 0),
    component.distanceLimitKm
  );
}

export const GEAR_USAGE_UNIT_LABEL: Record<GearUsageUnit, { short: string; plural: string }> = {
  km: { short: 'km', plural: 'km' },
  rounds: { short: 'rounds', plural: 'rounds' },
  sessions: { short: 'treinos', plural: 'treinos' },
};

/**
 * Categorias de equipamento elegíveis para uma sessão.
 * No Jiu-Jitsu depende de gi/no-gi: com kimono usa `jiujitsu_gi`, sem kimono usa `rashguard`.
 */
export function getGearCategoriesForSession(
  sportKey: string,
  metrics?: { gi?: boolean } | null
): GearCategory[] {
  switch (sportKey) {
    case 'running':
      return ['running_shoe'];
    case 'boxing':
      return ['boxing_gloves'];
    case 'cycling':
      return ['bike'];
    case 'jiujitsu':
      return metrics?.gi === false ? ['rashguard'] : ['jiujitsu_gi'];
    default:
      return [];
  }
}

/** Efeito de uma sessão sobre o desgaste de um equipamento. */
export type GearImpact = {
  gearId: string;
  km: number;
  sessions: number;
  rounds: number;
};

/**
 * Calcula o impacto de uma sessão no equipamento vinculado.
 *
 * O vínculo vem de `metrics.gearId`. Se a chave `gearId` existir (inclusive `null`, que significa
 * "sem equipamento"), ela vence; senão cai nas chaves legadas (`shoeId` na corrida, `bikeId` no ciclismo).
 */
export function getGearImpact(
  sportKey: string,
  metrics: Record<string, any> | null | undefined
): GearImpact | null {
  if (!metrics) return null;

  let gearId: unknown;
  if ('gearId' in metrics) {
    gearId = metrics.gearId;
  } else if (sportKey === 'running') {
    gearId = metrics.shoeId;
  } else if (sportKey === 'cycling') {
    gearId = metrics.bikeId;
  }
  if (typeof gearId !== 'string' || !gearId) return null;

  const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) && v > 0 ? v : 0);

  switch (sportKey) {
    case 'running':
      return { gearId, km: num(metrics.distanceMeters) / 1000, sessions: 1, rounds: 0 };
    case 'cycling':
      return { gearId, km: num(metrics.distanceKm), sessions: 1, rounds: 0 };
    case 'boxing':
      return { gearId, km: 0, sessions: 1, rounds: num(metrics.roundsCount) };
    case 'jiujitsu':
      return { gearId, km: 0, sessions: 1, rounds: 0 };
    default:
      return null;
  }
}
