
import { openDB, type DBSchema, type IDBPDatabase } from 'idb';

export type OfflineActionStatus = 'pending' | 'syncing' | 'failed';

export interface PendingAction {
  clientUuid: string;
  entityType: string;
  payload: Record<string, unknown>;
  createdAt: string;
  status: OfflineActionStatus;
  lastError?: string;
  syncStartedAt?: string;

  // true hanya jika kegagalan layak dicoba ulang otomatis.
  lastErrorRetryable?: boolean;
   // Pengaturan jeda retry otomatis.
  retryCount?: number;
  nextRetryAt?: string;
}

interface BudiMotorOfflineDB extends DBSchema {
  pending_actions: {
    key: string;
    value: PendingAction;
    indexes: {
      'by-status': OfflineActionStatus;
      'by-createdAt': string;
    };
  };
}

const DB_NAME = 'budi-motor-offline';
const DB_VERSION = 2;

let dbInstance: IDBPDatabase<BudiMotorOfflineDB> | null = null;

export async function getOfflineDb() {
  if (dbInstance) return dbInstance;

  dbInstance = await openDB<BudiMotorOfflineDB>(
    DB_NAME,
    DB_VERSION,
    {
      upgrade(db, _oldVersion, _newVersion, transaction) {
        // Buat store hanya jika belum ada agar data lama tidak hilang.
        if (!db.objectStoreNames.contains('pending_actions')) {
          db.createObjectStore('pending_actions', {
            keyPath: 'clientUuid',
          });
        }

        // Pastikan indeks tersedia saat migrasi.
        const store = transaction.objectStore('pending_actions');

        if (!store.indexNames.contains('by-status')) {
          store.createIndex('by-status', 'status');
        }

        if (!store.indexNames.contains('by-createdAt')) {
          store.createIndex('by-createdAt', 'createdAt');
        }
      },
    },
  );

  return dbInstance;
}