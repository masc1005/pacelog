import type { ISessionDocument } from '../../sessions/session.model.js';

/**
 * Calcula o valor médio de uma métrica de esporte nas últimas sessões comparáveis.
 * Usa as últimas 3 sessões do mesmo esporte como baseline provisório/imediato.
 * Retorna null se não houver pelo menos 3 sessões válidas.
 */
export function calculateSportMetricBaseline(
  sessions: ISessionDocument[],
  extractValue: (session: ISessionDocument) => number | null
): number | null {
  const values = sessions
    .map(extractValue)
    .filter((v): v is number => v !== null && v > 0);

  if (values.length < 3) return null;

  const last3 = values.slice(-3);
  return Math.round((last3.reduce((a, b) => a + b, 0) / last3.length) * 100) / 100;
}
