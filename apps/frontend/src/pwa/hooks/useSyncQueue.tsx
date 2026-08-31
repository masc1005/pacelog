// ────────────────────────────────────────────────────────────────────────────
// SyncQueueContext + useSyncQueue
// Hook central da fila de sincronização offline.
// ────────────────────────────────────────────────────────────────────────────

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from 'react';
import type { SyncQueueItem, SyncOperationType, ConflictInfo, SyncQueueContextType } from '../pwa.types';
import {
  enqueueOperation,
  processQueue,
  getQueueSnapshot,
  dismissQueueItem,
} from '../services/syncQueue.service';
import {
  buildConflictInfo,
  resolveWithLocal,
} from '../services/conflictResolver.service';
import { dbPutQueueItem, dbDeleteQueueItem } from '../services/indexedDb.service';
import { dbPurgeUser } from '../services/indexedDb.service';
import { useOnlineStatus } from './useOnlineStatus';

// ──────────────────────────────────────────────────────
// Contexto
// ──────────────────────────────────────────────────────

const SyncQueueContext = createContext<SyncQueueContextType | null>(null);

// ──────────────────────────────────────────────────────
// Provider
// ──────────────────────────────────────────────────────

interface SyncQueueProviderProps {
  children: React.ReactNode;
  userId: string | null;
}

export const SyncQueueProvider: React.FC<SyncQueueProviderProps> = ({ children, userId }) => {
  const isOnline = useOnlineStatus();

  const [pendingCount, setPendingCount] = useState(0);
  const [failedItems, setFailedItems] = useState<SyncQueueItem[]>([]);
  const [conflicts, setConflicts] = useState<ConflictInfo[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);

  const isMounted = useRef(true);
  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  // Atualiza o snapshot local da fila
  const refreshSnapshot = useCallback(async () => {
    if (!userId) {
      setPendingCount(0);
      setFailedItems([]);
      return;
    }
    try {
      const items = await getQueueSnapshot(userId);
      if (!isMounted.current) return;
      const pending = items.filter((i) => i.status === 'pending' || i.status === 'syncing');
      const failed = items.filter((i) => i.status === 'failed');
      setPendingCount(pending.length);
      setFailedItems(failed);
    } catch {
      // silencioso — IndexedDB pode não estar disponível em alguns contextos
    }
  }, [userId]);

  // Sincronizar agora
  const syncNow = useCallback(async () => {
    if (!userId || !isOnline || isSyncing) return;
    setIsSyncing(true);
    try {
      await processQueue(userId, (item, remoteUpdatedAt, remoteData) => {
        if (!isMounted.current) return;
        setConflicts((prev) => [
          ...prev.filter((c) => c.queueItem.id !== item.id),
          buildConflictInfo(item, remoteUpdatedAt, remoteData),
        ]);
      });
    } finally {
      if (isMounted.current) {
        setIsSyncing(false);
        await refreshSnapshot();
      }
    }
  }, [userId, isOnline, isSyncing, refreshSnapshot]);

  // Dispara sync ao reconectar
  useEffect(() => {
    if (isOnline && userId) {
      syncNow();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOnline, userId]);

  // Sincronização periódica a cada 2 minutos enquanto online
  useEffect(() => {
    if (!userId) return;
    const interval = setInterval(() => {
      if (isOnline && !isSyncing) syncNow();
    }, 2 * 60 * 1000);
    return () => clearInterval(interval);
  }, [userId, isOnline, isSyncing, syncNow]);

  // Carregar snapshot ao montar e ao mudar userId
  useEffect(() => {
    refreshSnapshot();
  }, [refreshSnapshot]);

  // Purge ao deslogar
  useEffect(() => {
    if (!userId) {
      // userId foi para null — usuário deslogou
      // Não purgar aqui pois não temos o userId anterior.
      // O purge explícito é feito via useSyncQueue().purgeUser(userId) no AuthContext.
    }
  }, [userId]);

  // ──────────────────────────────────────────────────────
  // API pública
  // ──────────────────────────────────────────────────────

  const enqueue = useCallback(
    async (
      operationType: SyncOperationType,
      payload: Record<string, unknown>,
      options: {
        clientUuid: string;
        entityTable: string;
        apiEndpoint: string;
        method: 'POST' | 'PUT' | 'PATCH' | 'DELETE';
      }
    ) => {
      if (!userId) return;
      await enqueueOperation(operationType, payload, { userId, ...options });
      await refreshSnapshot();
      // Tentar sincronizar imediatamente se online
      if (isOnline) syncNow();
    },
    [userId, isOnline, refreshSnapshot, syncNow]
  );

  const resolveConflict = useCallback(
    async (queueItemId: string, resolution: 'server' | 'local') => {
      const conflict = conflicts.find((c) => c.queueItem.id === queueItemId);
      if (!conflict) return;

      if (resolution === 'server') {
        // Descartar operação local
        await dbDeleteQueueItem(queueItemId);
      } else {
        // Reenviar com flag de overwrite
        const updatedItem = resolveWithLocal(conflict.queueItem);
        await dbPutQueueItem(updatedItem);
        if (isOnline) syncNow();
      }

      setConflicts((prev) => prev.filter((c) => c.queueItem.id !== queueItemId));
      await refreshSnapshot();
    },
    [conflicts, isOnline, syncNow, refreshSnapshot]
  );

  const dismissFailed = useCallback(
    async (queueItemId: string) => {
      await dismissQueueItem(queueItemId);
      setFailedItems((prev) => prev.filter((i) => i.id !== queueItemId));
      await refreshSnapshot();
    },
    [refreshSnapshot]
  );

  const value: SyncQueueContextType = {
    pendingCount,
    failedItems,
    conflicts,
    isSyncing,
    enqueue,
    syncNow,
    resolveConflict,
    dismissFailed,
  };

  return (
    <SyncQueueContext.Provider value={value}>
      {children}
    </SyncQueueContext.Provider>
  );
};

// ──────────────────────────────────────────────────────
// Hook público
// ──────────────────────────────────────────────────────

export function useSyncQueue(): SyncQueueContextType {
  const ctx = useContext(SyncQueueContext);
  if (!ctx) {
    throw new Error('useSyncQueue deve ser usado dentro de SyncQueueProvider');
  }
  return ctx;
}

/**
 * Hook auxiliar para purgar os dados offline de um usuário específico.
 * Chamar no logout, passando o userId que acabou de sair.
 */
export async function purgeOfflineData(userId: string): Promise<void> {
  await dbPurgeUser(userId);
}
