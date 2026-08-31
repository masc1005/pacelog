// ────────────────────────────────────────────────────────────────────────────
// PWA / Offline Sync — Tipos compartilhados
// ────────────────────────────────────────────────────────────────────────────

export type SyncOperationType =
  | 'create_session'
  | 'update_session'
  | 'delete_session'
  | 'update_settings'
  | 'strength_finish_session';

export type SyncStatus = 'pending' | 'syncing' | 'failed' | 'synced';

export interface SyncQueueItem {
  /** Identificador único da operação na fila */
  id: string;
  /** UUID gerado no cliente para garantir idempotência no servidor */
  clientUuid: string;
  /** Tipo da operação */
  operationType: SyncOperationType;
  /** Payload da operação (ex: SessionDTO, UserSettingsDTO parcial) */
  payload: Record<string, unknown>;
  /** Nome da entidade alvo (usado para ordenação FIFO por entidade) */
  entityTable: string;
  /** ISO timestamp de quando a operação foi criada localmente */
  createdAt: string;
  /** Número de tentativas de envio */
  attempts: number;
  /** ISO timestamp da última tentativa */
  lastAttemptAt?: string;
  /** Mensagem do último erro */
  lastError?: string;
  /** Status atual da operação */
  status: SyncStatus;
  /** userId do dono desta operação (para isolamento e purge no logout) */
  userId: string;
  /** URL da API para onde esta operação deve ser enviada */
  apiEndpoint: string;
  /** Método HTTP da operação */
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE';
}

// ────────────────────────────────────────────────────────────────────────────
// Conflitos
// ────────────────────────────────────────────────────────────────────────────

export interface ConflictInfo {
  /** Item da fila que gerou o conflito */
  queueItem: SyncQueueItem;
  /** updatedAt do registro no servidor (mais recente que a operação local) */
  remoteUpdatedAt: string;
  /** Dados resumidos do registro remoto para exibir ao usuário */
  remoteData: Record<string, unknown>;
  /** Dados locais da operação enfileirada */
  localData: Record<string, unknown>;
}

// ────────────────────────────────────────────────────────────────────────────
// Contexto público do hook useSyncQueue
// ────────────────────────────────────────────────────────────────────────────

export interface SyncQueueContextType {
  /** Total de itens pendentes (pending + syncing) */
  pendingCount: number;
  /** Itens com falha de validação/negócio (não serão reprocessados automaticamente) */
  failedItems: SyncQueueItem[];
  /** Conflitos aguardando decisão do usuário */
  conflicts: ConflictInfo[];
  /** Adicionar operação à fila */
  enqueue: (
    operationType: SyncOperationType,
    payload: Record<string, unknown>,
    options: {
      clientUuid: string;
      entityTable: string;
      apiEndpoint: string;
      method: 'POST' | 'PUT' | 'PATCH' | 'DELETE';
    }
  ) => Promise<void>;
  /** Forçar tentativa de sincronização manual */
  syncNow: () => Promise<void>;
  /** Resolver um conflito: 'server' mantém o remoto, 'local' reenvia o local */
  resolveConflict: (queueItemId: string, resolution: 'server' | 'local') => Promise<void>;
  /** Remover item com falha da fila manualmente */
  dismissFailed: (queueItemId: string) => Promise<void>;
  /** Se está ativamente sincronizando */
  isSyncing: boolean;
}
