import type { GearImpact } from '@pacelog/shared';

export type GearUsageDelta = Omit<GearImpact, 'gearId'> & { gearId: string };

/**
 * Calcula quanto cada equipamento deve variar quando uma sessão passa do estado `prev` para `next`.
 *
 * - criação:  prev = null,   next = impacto da sessão
 * - exclusão: prev = impacto, next = null
 * - edição:   prev e next. Se o equipamento é o mesmo, aplica só a diferença; se mudou, devolve o
 *             uso ao antigo e soma no novo.
 *
 * Deltas totalmente zerados são omitidos para evitar escritas desnecessárias.
 */
export function computeGearUsageDeltas(
  prev: GearImpact | null,
  next: GearImpact | null
): GearUsageDelta[] {
  const byGear = new Map<string, GearUsageDelta>();

  const accumulate = (impact: GearImpact | null, sign: 1 | -1) => {
    if (!impact) return;
    const current = byGear.get(impact.gearId) ?? {
      gearId: impact.gearId,
      km: 0,
      sessions: 0,
      rounds: 0,
    };
    current.km += sign * impact.km;
    current.sessions += sign * impact.sessions;
    current.rounds += sign * impact.rounds;
    byGear.set(impact.gearId, current);
  };

  accumulate(prev, -1);
  accumulate(next, 1);

  // Arredonda para evitar resíduos de ponto flutuante (ex.: 5.1 - 5 = 0.0999999...).
  const round = (n: number) => Math.round(n * 1000) / 1000;

  return Array.from(byGear.values())
    .map((d) => ({ ...d, km: round(d.km) }))
    .filter((d) => d.km !== 0 || d.sessions !== 0 || d.rounds !== 0);
}
