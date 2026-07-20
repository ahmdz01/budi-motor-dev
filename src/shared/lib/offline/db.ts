import { openDB, type DBSchema, type IDBPDatabase } from 'idb';

/**
 * Skema database lokal (IndexedDB) untuk offline queue.
 * SATU object store generik ('pending_actions') menampung semua
 * jenis aksi offline (transaksi POS, servis, dst) — dibedakan
 * lewat field 'entityType'. Ini menghindari perlu bikin store
 * terpisah untuk tiap modul bisnis yang belum tentu semuanya
 * butuh offline support (YAGNI).
 */

export type OfflineActionStatus = 'pending' | 'syncing' | 'failed';

export interface PendingAction {
  clientUuid: string; // Primary key — sama dengan client_uuid di database
  entityType: string; // contoh nanti: 'pos_transaction', 'service'
  payload: Record<string, unknown>; // bentuk data mentah, divalidasi ulang saat sync
  createdAt: string; // ISO timestamp
  status: OfflineActionStatus;
  lastError?: string;
}

interface BudiMotorOfflineDB extends DBSchema {
  pending_actions: {
    key: string; // clientUuid
    value: PendingAction;
    indexes: { 'by-status': OfflineActionStatus; 'by-createdAt': string };
  };
}

const DB_NAME = 'budi-motor-offline';
const DB_VERSION = 1;

let dbInstance: IDBPDatabase<BudiMotorOfflineDB> | null = null;

/**
 * Singleton connection — IndexedDB hanya boleh dibuka sekali per
 * sesi browser, membuka berulang-ulang tidak perlu dan sedikit
 * boros. Dipanggil lazy (baru buka koneksi saat pertama dibutuhkan).
 */
export async function getOfflineDb() {
  if (dbInstance) return dbInstance;

  dbInstance = await openDB<BudiMotorOfflineDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      const store = db.createObjectStore('pending_actions', {
        keyPath: 'clientUuid',
      });
      store.createIndex('by-status', 'status');
      store.createIndex('by-createdAt', 'createdAt');
    },
  });

  return dbInstance;
}
