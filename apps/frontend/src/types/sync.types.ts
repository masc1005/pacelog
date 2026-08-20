import { AnySession } from './session.types.js';

export type SyncStatus = 'pending' | 'syncing' | 'synced' | 'failed';

export interface SyncQueueItem {
  clientUuid: string;
  action: 'create' | 'update' | 'delete';
  session: AnySession;
  queuedAt: string;
  attempts: number;
  lastError?: string;
  status: SyncStatus;
}
