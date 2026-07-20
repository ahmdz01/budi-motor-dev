import { getOfflineDb, type PendingAction } from './db';
import { generateClientUuid } from './clientUuid';
import { logger } from '@/shared/lib/logger';

/**
 * Menambahkan aksi baru ke queue offline. Dipanggil saat suatu
 * mutasi (misal transaksi POS) gagal terkirim ke server karena
 * offline — BUKAN dipanggil untuk kondisi online normal.
 */
export async function enqueueOfflineAction(
  entityType: string,
  payload: Record<string, unknown>
): Promise<string> {
  const db = await getOfflineDb();
  const clientUuid = generateClientUuid();

  const action: PendingAction = {
    clientUuid,
    entityType,
    payload,
    createdAt: new Date().toISOString(),
    status: 'pending',
  };

  await db.add('pending_actions', action);
  logger.info('Aksi ditambahkan ke offline queue', { entityType, clientUuid });

  return clientUuid;
}

/**
 * Mengambil seluruh aksi yang masih menunggu sinkronisasi,
 * diurutkan dari yang paling lama (FIFO — konsisten dengan
 * prinsip urutan yang kita pegang di seluruh sistem).
 */
export async function getPendingActions(): Promise<PendingAction[]> {
  const db = await getOfflineDb();
  return db.getAllFromIndex('pending_actions', 'by-createdAt');
}

export async function updateActionStatus(
  clientUuid: string,
  status: PendingAction['status'],
  lastError?: string
): Promise<void> {
  const db = await getOfflineDb();
  const action = await db.get('pending_actions', clientUuid);
  if (!action) return;

  await db.put('pending_actions', { ...action, status, lastError });
}

export async function removeOfflineAction(clientUuid: string): Promise<void> {
  const db = await getOfflineDb();
  await db.delete('pending_actions', clientUuid);
}

export async function getPendingActionsCount(): Promise<number> {
  const db = await getOfflineDb();
  return db.countFromIndex('pending_actions', 'by-status', 'pending');
}
