// ────────────────────────────────────────────────────────────────────────────
// Conflict Resolver Service
// Estratégia: last-write-wins com aviso visual.
// Compara updatedAt do servidor com createdAt da operação local.
// ────────────────────────────────────────────────────────────────────────────

import type { SyncQueueItem, ConflictInfo } from '../pwa.types';

/**
 * Detecta se há conflito entre uma operação local enfileirada e o estado remoto.
 * Conflito = o servidor foi atualizado depois que a operação local foi criada.
 */
export function detectConflict(
  item: SyncQueueItem,
  remoteUpdatedAt: string
): boolean {
  const localCreatedAt = new Date(item.createdAt).getTime();
  const remoteUpdate = new Date(remoteUpdatedAt).getTime();
  return remoteUpdate > localCreatedAt;
}

/**
 * Cria um objeto ConflictInfo a partir de um item da fila e dados remotos.
 */
export function buildConflictInfo(
  item: SyncQueueItem,
  remoteUpdatedAt: string,
  remoteData: Record<string, unknown>
): ConflictInfo {
  return {
    queueItem: item,
    remoteUpdatedAt,
    remoteData,
    localData: item.payload,
  };
}

/**
 * Resolve o conflito com a estratégia "manter servidor" (last-write-wins padrão).
 * O item da fila é descartado — o dado remoto prevalece.
 */
export function resolveWithServer(): 'discard_local' {
  return 'discard_local';
}

/**
 * Resolve o conflito com a estratégia "usar versão local".
 * O item da fila deve ser reenviado com force=true ou campo updatedAt forçado.
 */
export function resolveWithLocal(item: SyncQueueItem): SyncQueueItem {
  return {
    ...item,
    status: 'pending',
    attempts: 0,
    lastError: undefined,
    lastAttemptAt: undefined,
    payload: {
      ...item.payload,
      // Sinaliza para o backend que deve sobrescrever mesmo se o updatedAt remoto for mais recente
      _forceOverwrite: true,
    },
  };
}

/**
 * Retorna uma descrição legível do conflito para exibição na UI.
 */
export function describeConflict(conflict: ConflictInfo): {
  remoteLabel: string;
  localLabel: string;
} {
  const remoteDiff = formatRelativeTime(conflict.remoteUpdatedAt);
  const localDiff = formatRelativeTime(conflict.queueItem.createdAt);

  return {
    remoteLabel: `Versão do servidor (${remoteDiff})`,
    localLabel: `Sua versão local (${localDiff})`,
  };
}

function formatRelativeTime(isoDate: string): string {
  const diffMs = Date.now() - new Date(isoDate).getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  const diffH = Math.floor(diffMin / 60);
  const diffD = Math.floor(diffH / 24);

  if (diffD > 0) return `há ${diffD} dia${diffD > 1 ? 's' : ''}`;
  if (diffH > 0) return `há ${diffH} hora${diffH > 1 ? 's' : ''}`;
  if (diffMin > 0) return `há ${diffMin} minuto${diffMin > 1 ? 's' : ''}`;
  return 'agora há pouco';
}
