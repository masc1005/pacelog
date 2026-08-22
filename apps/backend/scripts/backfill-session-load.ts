/**
 * Script de backfill: popula o campo `load` em sessões existentes
 * que ainda não possuem o campo estruturado de carga.
 *
 * Regras:
 * - Processa somente sessões `completed` com `rpe > 0` e `durationSeconds > 0`.
 * - Idempotente: sessões que já possuem `load` são ignoradas.
 * - Processa em batches de 100 para evitar overhead de memória.
 * - `sessionalLoad` permanece igual a `load.srpe` (mesma fórmula).
 * - Produz relatório final com contagens.
 *
 * Uso:
 *   cd apps/backend
 *   npx tsx scripts/backfill-session-load.ts
 */

import { connectDatabase, disconnectDatabase } from '../src/config/database.js';
import { SessionModel } from '../src/modules/sessions/session.model.js';
import { calculateSrpeLoadSafe, SRPE_CALCULATION_VERSION } from '../src/modules/progress/load/calculate-srpe.js';

const BATCH_SIZE = 100;

async function backfillSessionLoad(): Promise<void> {
  await connectDatabase();

  let updated = 0;
  let skippedNoRpe = 0;
  let skippedAlreadyHasLoad = 0;
  let skippedNotCompleted = 0;
  let errors = 0;

  console.log(`[backfill] Iniciando backfill de carga em batches de ${BATCH_SIZE}...`);

  const total = await SessionModel.countDocuments({ load: null });
  console.log(`[backfill] Sessões sem campo load: ${total}`);

  let processedTotal = 0;

  while (true) {
    const sessions = await SessionModel.find({ load: null })
      .limit(BATCH_SIZE)
      .lean();

    if (sessions.length === 0) break;

    for (const session of sessions) {
      try {
        if (session.status !== 'completed') {
          skippedNotCompleted++;
          // Marca como processado com load: null explícito (campo existe, sem calcular)
          await SessionModel.updateOne({ _id: session._id }, { $set: { 'load': null } });
          continue;
        }

        const rpe = session.rpe;
        const dur = session.durationSeconds;

        if (!rpe || rpe <= 0 || !dur || dur <= 0) {
          skippedNoRpe++;
          await SessionModel.updateOne({ _id: session._id }, { $set: { 'load': null } });
          continue;
        }

        const srpe = calculateSrpeLoadSafe(rpe, dur);
        if (srpe === null) {
          skippedNoRpe++;
          await SessionModel.updateOne({ _id: session._id }, { $set: { 'load': null } });
          continue;
        }

        const durationMinutes = Math.round((dur / 60) * 100) / 100;

        await SessionModel.updateOne(
          { _id: session._id },
          {
            $set: {
              load: {
                srpe,
                rpe,
                durationMinutes,
                calculationVersion: SRPE_CALCULATION_VERSION,
              },
              // Garantir que sessionalLoad está sincronizado
              sessionalLoad: srpe,
            },
          }
        );

        updated++;
      } catch (err) {
        errors++;
        console.error(`[backfill] Erro na sessão ${session._id}:`, err);
      }
    }

    processedTotal += sessions.length;
    console.log(`[backfill] Processados ${processedTotal} / ${total}`);
  }

  console.log('\n===== RELATÓRIO DE BACKFILL =====');
  console.log(`Atualizados (load calculado):     ${updated}`);
  console.log(`Ignorados (sem RPE/duração):      ${skippedNoRpe}`);
  console.log(`Ignorados (não concluídos):        ${skippedNotCompleted}`);
  console.log(`Ignorados (já tinham load):        ${skippedAlreadyHasLoad}`);
  console.log(`Erros:                             ${errors}`);
  console.log('=================================\n');

  await disconnectDatabase();
}

backfillSessionLoad().catch((err) => {
  console.error('[backfill] Falha fatal:', err);
  process.exit(1);
});
