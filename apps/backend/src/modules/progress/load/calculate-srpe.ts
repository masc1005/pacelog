import { InvalidRpeError, InvalidDurationError } from './load.errors.js';

// ==========================================
// CÁLCULO CENTRAL DE sRPE-TL
// Fórmula: sRPE-TL = RPE × (durationSeconds / 60)
// Versão da fórmula: 1
// ==========================================

/** Versão atual da fórmula de cálculo. Incrementar ao alterar a lógica. */
export const SRPE_CALCULATION_VERSION = 1;

/** RPE mínimo válido (Borg CR10) */
export const RPE_MIN = 1;

/** RPE máximo válido (Borg CR10) */
export const RPE_MAX = 10;

/** Duração máxima válida de uma sessão: 24 horas em segundos */
export const MAX_DURATION_SECONDS = 86400;

/**
 * Calcula a carga interna da sessão via sRPE-TL (Session RPE Training Load).
 * Fórmula: sRPE-TL = RPE × duração em minutos
 *
 * @param rpe Percepção subjetiva de esforço (1–10, Borg CR10)
 * @param durationSeconds Duração da sessão em segundos (inteiro > 0)
 * @returns Carga em Unidades Arbitrárias (AU), arredondada para inteiro
 * @throws {InvalidRpeError} se o RPE for inválido
 * @throws {InvalidDurationError} se a duração for inválida
 */
export function calculateSrpeLoad(rpe: number, durationSeconds: number): number {
  if (!Number.isInteger(rpe) || rpe < RPE_MIN || rpe > RPE_MAX) {
    throw new InvalidRpeError(rpe);
  }

  if (!Number.isInteger(durationSeconds) || durationSeconds <= 0 || durationSeconds > MAX_DURATION_SECONDS) {
    throw new InvalidDurationError(durationSeconds);
  }

  return Math.round(rpe * (durationSeconds / 60));
}

/**
 * Versão segura de `calculateSrpeLoad` que retorna `null` em vez de lançar exceção.
 * Use quando o RPE ou a duração podem ser ausentes/inválidos por design.
 */
export function calculateSrpeLoadSafe(
  rpe: number | undefined | null,
  durationSeconds: number | undefined | null
): number | null {
  if (rpe == null || durationSeconds == null) return null;

  const rpeInt = Math.round(rpe);
  const durInt = Math.round(durationSeconds);

  if (rpeInt < RPE_MIN || rpeInt > RPE_MAX) return null;
  if (durInt <= 0 || durInt > MAX_DURATION_SECONDS) return null;

  return Math.round(rpeInt * (durInt / 60));
}
