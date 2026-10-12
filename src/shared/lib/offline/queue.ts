
import { getOfflineDb, type PendingAction } from './db';
import { generateClientUuid } from './clientUuid';
import { logger } from '@/shared/lib/logger';

const STALE_SYNC_AFTER_MS = 60_000;
const BASE_RETRY_DELAY_MS = 30_000;
const MAX_RETRY_DELAY_MS = 15 * 60_000;

/**
 * Memeriksa apakah waktu retry transaksi sudah tiba.
 * Tanggal yang tidak valid dianggap layak diperiksa ulang,
 * agar transaksi tidak tertahan selamanya.
 */
export function isOfflineActionRetryDue(
  action: Pick<PendingAction, 'nextRetryAt'>,
  now = Date.now(),
): boolean {
  if (!action.nextRetryAt) {
    return true;
  }

  const retryAt = Date.parse(action.nextRetryAt);

  return !Number.isFinite(retryAt) || retryAt <= now;
}

/**
 * Menambahkan aksi ke antrean IndexedDB.
 *
 * Pemeriksaan UUID dan penambahan data dilakukan dalam
 * satu transaksi agar pemanggilan bersamaan tidak mudah
 * menghasilkan duplikasi antrean lokal.
 */
export async function enqueueOfflineAction(
  entityType: string,
  payload: Record<string, unknown>,
  clientUuid?: string,
): Promise<string> {
  const db = await getOfflineDb();
  const resolvedClientUuid = clientUuid ?? generateClientUuid();
  const tx = db.transaction('pending_actions', 'readwrite');

  try {
    const existing = await tx.store.get(resolvedClientUuid);

    if (existing) {
      const samePayload =
        JSON.stringify(existing.payload) === JSON.stringify(payload);

      if (
        existing.entityType !== entityType ||
        !samePayload
      ) {
        await tx.done;

        throw new Error(
          'UUID transaksi sudah digunakan untuk aksi yang berbeda.',
        );
      }

      await tx.done;

      logger.info('Aksi sudah ada di offline queue', {
        entityType,
        clientUuid: resolvedClientUuid,
        status: existing.status,
      });

      return existing.clientUuid;
    }

    const action: PendingAction = {
      clientUuid: resolvedClientUuid,
      entityType,
      payload,
      createdAt: new Date().toISOString(),
      status: 'pending',
      retryCount: 0,
    };

    await tx.store.add(action);
    await tx.done;

    logger.info('Aksi ditambahkan ke offline queue', {
      entityType,
      clientUuid: resolvedClientUuid,
    });

    return resolvedClientUuid;
  } catch (error) {
    try {
      tx.abort();
    } catch {
      // Transaksi mungkin sudah selesai atau gagal.
    }

    throw error;
  }
}

/**
 * Mengambil seluruh antrean berdasarkan waktu pembuatan.
 */
export async function getPendingActions(): Promise<PendingAction[]> {
  const db = await getOfflineDb();

  return db.getAllFromIndex(
    'pending_actions',
    'by-createdAt',
  );
}

/**
 * Memperbarui status antrean secara atomik.
 *
 * Jika kegagalan bersifat sementara, sistem menyimpan jadwal retry:
 * 30 detik, 1 menit, 2 menit, dan seterusnya, maksimal 15 menit.
 */
export async function updateActionStatus(
  clientUuid: string,
  status: PendingAction['status'],
  lastError?: string,
  lastErrorRetryable?: boolean,
): Promise<void> {
  const db = await getOfflineDb();
  const tx = db.transaction('pending_actions', 'readwrite');

  try {
    const action = await tx.store.get(clientUuid);

    if (!action) {
      await tx.done;
      return;
    }

    const retryableFailure =
      status === 'failed' &&
      lastErrorRetryable === true;

    const retryCount = retryableFailure
      ? (action.retryCount ?? 0) + 1
      : (action.retryCount ?? 0);

    const retryExponent = Math.min(
      Math.max(retryCount - 1, 0),
      5,
    );

    const retryDelayMs = Math.min(
      BASE_RETRY_DELAY_MS * 2 ** retryExponent,
      MAX_RETRY_DELAY_MS,
    );

    const updatedAction: PendingAction = {
      ...action,
      status,

      lastError:
        status === 'failed'
          ? lastError
          : undefined,

      lastErrorRetryable:
        status === 'failed'
          ? (lastErrorRetryable ?? false)
          : undefined,

      syncStartedAt:
        status === 'syncing'
          ? new Date().toISOString()
          : undefined,

      retryCount,

      nextRetryAt: retryableFailure
        ? new Date(Date.now() + retryDelayMs).toISOString()
        : undefined,
    };

    await tx.store.put(updatedAction);
    await tx.done;
  } catch (error) {
    try {
      tx.abort();
    } catch {
      // Transaksi mungkin sudah selesai atau gagal.
    }

    throw error;
  }
}

/**
 * Menghapus aksi setelah sinkronisasi berhasil.
 */
export async function removeOfflineAction(
  clientUuid: string,
): Promise<void> {
  const db = await getOfflineDb();

  await db.delete('pending_actions', clientUuid);
}

/**
 * Menghapus hanya antrean yang masih berstatus failed.
 *
 * Pemeriksaan status dan penghapusan dilakukan dalam
 * satu transaksi IndexedDB.
 */
export async function discardFailedOfflineAction(
  clientUuid: string,
): Promise<boolean> {
  const db = await getOfflineDb();
  const tx = db.transaction('pending_actions', 'readwrite');

  try {
    const action = await tx.store.get(clientUuid);

    if (!action || action.status !== 'failed') {
      await tx.done;
      return false;
    }

    await tx.store.delete(clientUuid);
    await tx.done;

    logger.warn('Transaksi gagal dibuang dari antrean lokal', {
      clientUuid,
    });

    return true;
  } catch (error) {
    try {
      tx.abort();
    } catch {
      // Transaksi mungkin sudah selesai atau gagal.
    }

    throw error;
  }
}

/**
 * Menghitung semua antrean POS yang belum selesai.
 */
export async function getPendingActionsCount(): Promise<number> {
  const db = await getOfflineDb();

  const [pending, syncing, failed] = await Promise.all([
    db.countFromIndex(
      'pending_actions',
      'by-status',
      'pending',
    ),
    db.countFromIndex(
      'pending_actions',
      'by-status',
      'syncing',
    ),
    db.countFromIndex(
      'pending_actions',
      'by-status',
      'failed',
    ),
  ]);

  return pending + syncing + failed;
}

/**
 * Mengklaim satu transaksi POS untuk diproses.
 *
 * Pembacaan status dan perubahan ke syncing terjadi dalam
 * satu transaksi IndexedDB. Dua pemanggilan yang bersamaan
 * tidak dapat sama-sama mengklaim antrean pending yang sama.
 *
 * allowPermanentRetry hanya digunakan ketika pengguna
 * secara manual meminta retry transaksi tertentu.
 */
export async function claimOfflineActionForSync(
  clientUuid: string,
  allowPermanentRetry = false,
): Promise<PendingAction | null> {
  const db = await getOfflineDb();
  const tx = db.transaction('pending_actions', 'readwrite');

  try {
    const action = await tx.store.get(clientUuid);

    if (
      !action ||
      action.entityType !== 'pos_transaction'
    ) {
      await tx.done;
      return null;
    }

    const now = Date.now();

    const startedAt = action.syncStartedAt
      ? Date.parse(action.syncStartedAt)
      : Number.NaN;

    const staleSync =
      action.status === 'syncing' &&
      (
        !Number.isFinite(startedAt) ||
        now - startedAt >= STALE_SYNC_AFTER_MS
      );

    const dueForAutomaticRetry =
      action.status === 'failed' &&
      action.lastErrorRetryable === true &&
      isOfflineActionRetryDue(action, now);

    const manualRetry =
      action.status === 'failed' &&
      allowPermanentRetry;

    const eligible =
      action.status === 'pending' ||
      dueForAutomaticRetry ||
      manualRetry ||
      staleSync;

    if (!eligible) {
      await tx.done;
      return null;
    }

    const claimed: PendingAction = {
      ...action,
      status: 'syncing',
      lastError: undefined,
      lastErrorRetryable: undefined,
      syncStartedAt: new Date(now).toISOString(),
      nextRetryAt: undefined,
    };

    await tx.store.put(claimed);
    await tx.done;

    return claimed;
  } catch (error) {
    try {
      tx.abort();
    } catch {
      // Transaksi mungkin sudah selesai atau gagal.
    }

    throw error;
  }
}