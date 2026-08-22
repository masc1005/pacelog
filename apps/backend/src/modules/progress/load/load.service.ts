import type { SessionLoad } from '@pacelog/shared';
import { calculateSrpeLoadSafe, SRPE_CALCULATION_VERSION } from './calculate-srpe.js';

// ==========================================
// HELPER CENTRAL DE CARGA DA SESSÃO
// ==========================================

/**
 * Resultado do helper `buildSessionLoad`.
 * Ambos os campos são calculados a partir de uma única chamada — nunca divergem.
 */
export type SessionLoadPayload = {
  /** Campo legado — mantido para retrocompatibilidade com endpoints e clientes antigos */
  sessionalLoad: number;
  /** Campo oficial estruturado — use `load.srpe` em todos os novos endpoints */
  load: SessionLoad;
} | {
  sessionalLoad: null;
  load: null;
};

/**
 * Constrói o payload de carga da sessão de forma unificada.
 *
 * Regras:
 * - Se `rpe` for `undefined`, retorna `null` em ambos os campos.
 * - Se a sessão não for `completed`, retorna `null` em ambos os campos.
 * - `sessionalLoad` e `load.srpe` sempre têm o mesmo valor.
 * - O frontend nunca deve enviar `load.srpe` como fonte de verdade.
 *
 * @param rpe Percepção subjetiva de esforço (1–10). Pode ser undefined.
 * @param durationSeconds Duração da sessão em segundos.
 * @param status Status da sessão. Somente 'completed' gera carga.
 */
export function buildSessionLoad(
  rpe: number | undefined,
  durationSeconds: number,
  status: string = 'completed'
): SessionLoadPayload {
  // Somente sessões concluídas geram carga de progresso
  if (status !== 'completed') {
    return { sessionalLoad: null, load: null };
  }

  const srpe = calculateSrpeLoadSafe(rpe, durationSeconds);

  if (srpe === null || rpe === undefined) {
    return { sessionalLoad: null, load: null };
  }

  const durationMinutes = Math.round((durationSeconds / 60) * 100) / 100;

  const load: SessionLoad = {
    srpe,
    rpe,
    durationMinutes,
    calculationVersion: SRPE_CALCULATION_VERSION,
  };

  return {
    sessionalLoad: srpe, // mesmo valor — nunca diverge de load.srpe
    load,
  };
}
