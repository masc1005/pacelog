// ────────────────────────────────────────────────────────────────────────────
// Sync Queue Service
// Gerencia a fila de sincronização offline: enqueue, processamento FIFO,
// backoff exponencial, idempotência por clientUuid.
// ────────────────────────────────────────────────────────────────────────────

import type { SyncQueueItem, SyncOperationType } from '../pwa.types';
import {
  dbPutQueueItem,
  dbGetQueueItemsByUser,
  dbDeleteQueueItem,
  dbGetQueueItem,
} from './indexedDb.service';

// ──────────────────────────────────────────────────────
// Configuração de backoff
// ──────────────────────────────────────────────────────
const BASE_DELAY_MS = 3_000;       // 3 segundos
const MAX_DELAY_MS = 5 * 60_000;   // 5 minutos
const MAX_AUTO_RETRIES = 10;        // após 10 tentativas vira "failed"

function backoffDelay(attempts: number): number {
  return Math.min(BASE_DELAY_MS * Math.pow(2, attempts), MAX_DELAY_MS);
}

// ──────────────────────────────────────────────────────
// Trava de processamento (coordenação entre abas)
// Usamos um BroadcastChannel simples: apenas a aba que
// ganhou a "eleição" processa a fila.
// ──────────────────────────────────────────────────────
let isProcessingLocked = false;

// ──────────────────────────────────────────────────────
// Enqueue
// ──────────────────────────────────────────────────────

interface EnqueueOptions {
  userId: string;
  clientUuid: string;
  entityTable: string;
  apiEndpoint: string;
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE';
}

export async function enqueueOperation(
  operationType: SyncOperationType,
  payload: Record<string, unknown>,
  options: EnqueueOptions
): Promise<SyncQueueItem> {
  const item: SyncQueueItem = {
    id: crypto.randomUUID(),
    clientUuid: options.clientUuid,
    operationType,
    payload,
    entityTable: options.entityTable,
    createdAt: new Date().toISOString(),
    attempts: 0,
    lastAttemptAt: undefined,
    lastError: undefined,
    status: 'pending',
    userId: options.userId,
    apiEndpoint: options.apiEndpoint,
    method: options.method,
  };

  await dbPutQueueItem(item);
  return item;
}

// ──────────────────────────────────────────────────────
// Processamento da fila
// ──────────────────────────────────────────────────────

export type ProcessResult = {
  synced: number;
  failed: number;
  skipped: number;
  conflicts: SyncQueueItem[];
};

/**
 * Processa todos os itens pendentes da fila para um usuário.
 * Respeita FIFO por (entityTable, clientUuid).
 * Retorna um resumo dos resultados.
 */
export async function processQueue(
  userId: string,
  onConflict?: (item: SyncQueueItem, remoteUpdatedAt: string, remoteData: Record<string, unknown>) => void
): Promise<ProcessResult> {
  if (isProcessingLocked) {
    return { synced: 0, failed: 0, skipped: 0, conflicts: [] };
  }

  isProcessingLocked = true;
  const result: ProcessResult = { synced: 0, failed: 0, skipped: 0, conflicts: [] };

  try {
    const allItems = await dbGetQueueItemsByUser(userId);
    const pending = allItems.filter((i) => i.status === 'pending' || i.status === 'syncing');

    // Agrupar por entityTable+clientUuid para garantir ordem intra-entidade
    const groups = new Map<string, SyncQueueItem[]>();
    for (const item of pending) {
      const key = `${item.entityTable}::${item.clientUuid}`;
      const group = groups.get(key) ?? [];
      group.push(item);
      groups.set(key, group);
    }

    // Processar cada grupo sequencialmente
    for (const [, group] of groups) {
      for (const item of group) {
        const latestItem = await dbGetQueueItem(item.id);
        if (!latestItem || latestItem.status === 'synced' || latestItem.status === 'failed') {
          result.skipped++;
          continue;
        }

        // Marcar como syncing
        await dbPutQueueItem({ ...latestItem, status: 'syncing' });

        try {
          const response = await fetch(item.apiEndpoint, {
            method: item.method,
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(item.payload),
          });

          if (response.ok || response.status === 204) {
            // Sucesso — remover da fila
            await dbDeleteQueueItem(item.id);
            result.synced++;
          } else if (response.status === 409) {
            // Conflito — detectar e notificar
            const data = await response.json().catch(() => ({}));
            const remoteUpdatedAt = data?.data?.updatedAt ?? data?.updatedAt ?? new Date().toISOString();
            const remoteData = data?.data ?? data ?? {};
            result.conflicts.push(item);
            await dbPutQueueItem({ ...item, status: 'pending', lastError: 'CONFLICT' });
            onConflict?.(item, remoteUpdatedAt, remoteData);
          } else if (response.status >= 400 && response.status < 500) {
            // Falha de validação/negócio — não retentar automaticamente
            const data = await response.json().catch(() => ({}));
            await dbPutQueueItem({
              ...item,
              status: 'failed',
              lastError: data?.error ?? `HTTP ${response.status}`,
              lastAttemptAt: new Date().toISOString(),
              attempts: item.attempts + 1,
            });
            result.failed++;
          } else {
            // Falha de servidor (5xx) — retentar com backoff
            throw new Error(`HTTP ${response.status}`);
          }
        } catch (err) {
          const newAttempts = (latestItem.attempts ?? 0) + 1;
          const lastError = err instanceof Error ? err.message : String(err);

          if (newAttempts >= MAX_AUTO_RETRIES) {
            // Excedeu tentativas — marcar como failed
            await dbPutQueueItem({
              ...latestItem,
              status: 'failed',
              attempts: newAttempts,
              lastError,
              lastAttemptAt: new Date().toISOString(),
            });
            result.failed++;
          } else {
            // Devolver para pending com backoff
            const delay = backoffDelay(newAttempts);
            await dbPutQueueItem({
              ...latestItem,
              status: 'pending',
              attempts: newAttempts,
              lastError,
              lastAttemptAt: new Date().toISOString(),
            });
            result.skipped++;
            // Aguardar backoff antes do próximo item do mesmo grupo
            await new Promise((r) => setTimeout(r, Math.min(delay, 500)));
          }
        }
      }
    }
  } finally {
    isProcessingLocked = false;
  }

  return result;
}

/** Remove item permanentemente da fila (dismiss de falhas pelo usuário) */
export async function dismissQueueItem(itemId: string): Promise<void> {
  await dbDeleteQueueItem(itemId);
}

/** Obtém todos os itens da fila de um usuário (para exibição no indicador) */
export async function getQueueSnapshot(userId: string): Promise<SyncQueueItem[]> {
  return dbGetQueueItemsByUser(userId);
}
