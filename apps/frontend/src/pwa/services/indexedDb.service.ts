// ────────────────────────────────────────────────────────────────────────────
// IndexedDB Service
// Abstração leve sobre IndexedDB, sem dependências externas.
// Banco: pacelog_offline  — versão 1
// Object stores: sync_queue
// ────────────────────────────────────────────────────────────────────────────

import type { SyncQueueItem } from '../pwa.types';

const DB_NAME = 'pacelog_offline';
const DB_VERSION = 1;
const STORE_SYNC_QUEUE = 'sync_queue';

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      if (!db.objectStoreNames.contains(STORE_SYNC_QUEUE)) {
        const store = db.createObjectStore(STORE_SYNC_QUEUE, { keyPath: 'id' });
        store.createIndex('userId', 'userId', { unique: false });
        store.createIndex('status', 'status', { unique: false });
        store.createIndex('entityTable_clientUuid', ['entityTable', 'clientUuid'], {
          unique: false,
        });
        store.createIndex('createdAt', 'createdAt', { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => {
      dbPromise = null;
      reject(request.error);
    };
    request.onblocked = () => {
      dbPromise = null;
      reject(new Error('IndexedDB blocked — feche outras abas do PACELOG e tente novamente.'));
    };
  });

  return dbPromise;
}

function runTransaction<T>(
  storeName: string,
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(storeName, mode);
        const store = tx.objectStore(storeName);
        const request = fn(store);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
        tx.onerror = () => reject(tx.error);
      })
  );
}

// ────────────────────────────────────────────────────────────────────────────
// API pública — sync_queue
// ────────────────────────────────────────────────────────────────────────────

/** Insere ou substitui um item na fila */
export async function dbPutQueueItem(item: SyncQueueItem): Promise<void> {
  await runTransaction<IDBValidKey>(STORE_SYNC_QUEUE, 'readwrite', (store) =>
    store.put(item)
  );
}

/** Lê um item da fila pelo id */
export async function dbGetQueueItem(id: string): Promise<SyncQueueItem | undefined> {
  return runTransaction<SyncQueueItem | undefined>(STORE_SYNC_QUEUE, 'readonly', (store) =>
    store.get(id)
  );
}

/** Remove um item da fila pelo id */
export async function dbDeleteQueueItem(id: string): Promise<void> {
  await runTransaction<undefined>(STORE_SYNC_QUEUE, 'readwrite', (store) =>
    store.delete(id)
  );
}

/** Lista todos os itens da fila para um usuário específico, ordenados por createdAt */
export function dbGetQueueItemsByUser(userId: string): Promise<SyncQueueItem[]> {
  return openDb().then(
    (db) =>
      new Promise<SyncQueueItem[]>((resolve, reject) => {
        const tx = db.transaction(STORE_SYNC_QUEUE, 'readonly');
        const store = tx.objectStore(STORE_SYNC_QUEUE);
        const index = store.index('userId');
        const request = index.getAll(IDBKeyRange.only(userId));
        request.onsuccess = () => {
          const items = (request.result as SyncQueueItem[]).sort(
            (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          );
          resolve(items);
        };
        request.onerror = () => reject(request.error);
      })
  );
}

/**
 * Purga todos os dados de um usuário do IndexedDB.
 * Chamado no logout para evitar vazamento de dados entre atletas.
 */
export function dbPurgeUser(userId: string): Promise<void> {
  return openDb().then(
    (db) =>
      new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_SYNC_QUEUE, 'readwrite');
        const store = tx.objectStore(STORE_SYNC_QUEUE);
        const index = store.index('userId');
        const cursorRequest = index.openCursor(IDBKeyRange.only(userId));

        cursorRequest.onsuccess = (event) => {
          const cursor = (event.target as IDBRequest<IDBCursorWithValue | null>).result;
          if (cursor) {
            cursor.delete();
            cursor.continue();
          }
        };
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      })
  );
}
