
import { logger } from '@/shared/lib/logger';
import {
  claimOfflineActionForSync,
  getPendingActions,
  isOfflineActionRetryDue,
  removeOfflineAction,
  updateActionStatus,
} from '@/shared/lib/offline/queue';
import { createClient } from '@/shared/lib/supabase/client';
import { callRpc } from '@/shared/lib/supabase/rpc';

import type { PendingAction } from '@/shared/lib/offline/db';
import type { PosTransactionParamsPayload } from '../hooks/useCreatePosTransaction';

type RpcCreatePosTransactionParams = PosTransactionParamsPayload & {
  p_client_uuid: string;
};

interface RpcCreatePosTransactionResult {
  transaction_id: string;
  total_amount: number;
  change_amount: number;
}

interface SyncResult {
  synced: number;
  failed: number;
  skipped?: boolean;
}

interface RpcErrorLike {
  code?: unknown;
  status?: unknown;
  message?: unknown;
}

const STALE_SYNC_AFTER_MS = 60_000;
const SYNC_LOCK_NAME = 'budi-motor-pos-sync';

let fallbackSyncInProgress = false;

function isStaleSync(action: PendingAction, now: number): boolean {
  if (!action.syncStartedAt) return true;

  const startedAt = Date.parse(action.syncStartedAt);

  return (
    !Number.isFinite(startedAt) ||
    now - startedAt >= STALE_SYNC_AFTER_MS
  );
}

/**
 * Kegagalan jaringan/timeout/5xx dianggap sementara.
 * Error Postgres/PostgREST, validasi, dan izin tidak otomatis dicoba
 * berulang-ulang.
 */
function isRetryableSyncError(error: unknown): boolean {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return true;
  }

  if (error instanceof TypeError) {
    return true;
  }

  const value =
    error && typeof error === 'object'
      ? (error as RpcErrorLike)
      : {};

  const code =
    typeof value.code === 'string'
      ? value.code.trim().toUpperCase()
      : '';

  const status =
    typeof value.status === 'number'
      ? value.status
      : null;

  const message =
    typeof value.message === 'string'
      ? value.message
      : error instanceof Error
        ? error.message
        : typeof error === 'string'
          ? error
          : '';

  const networkCodes = new Set([
    'ECONNRESET',
    'ECONNREFUSED',
    'ENOTFOUND',
    'ETIMEDOUT',
    'EAI_AGAIN',
    'ERR_NETWORK',
  ]);

  if (networkCodes.has(code)) return true;

  if (
    status === 0 ||
    status === 408 ||
    status === 429 ||
    (status !== null && status >= 500)
  ) {
    return true;
  }

  // Kode server/database biasanya menandakan kesalahan yang harus
  // diperiksa pengguna, bukan diulang otomatis.
  if (code || (status !== null && status >= 400)) {
    return false;
  }

  return /(network|load failed|connection|socket|timed?\s*out|timeout|offline|internet|aborted|failed to fetch|fetch failed|networkerror)/i.test(
    message,
  );
}

async function processPendingTransactions(
  forceRetryClientUuid?: string,
): Promise<SyncResult> {

const initialActions = await getPendingActions();
const now = Date.now();

const eligibleActions = initialActions.filter((action) => {
  if (action.entityType !== 'pos_transaction') {
    return false;
  }

  // Retry manual hanya memproses transaksi yang dipilih.
  if (forceRetryClientUuid) {
    return (
      action.clientUuid === forceRetryClientUuid &&
      action.status === 'failed'
    );
  }

  // Transaksi baru yang belum dikirim.
  if (action.status === 'pending') {
    return true;
  }

  // Kegagalan sementara hanya dicoba lagi setelah waktunya tiba.
  if (
    action.status === 'failed' &&
    action.lastErrorRetryable === true
  ) {
    return isOfflineActionRetryDue(action, now);
  }

  // Pulihkan proses yang kemungkinan macet.
  return (
    action.status === 'syncing' &&
    isStaleSync(action, now)
  );
});


  if (eligibleActions.length === 0) {
    return { synced: 0, failed: 0 };
  }

  const supabase = createClient();

  let synced = 0;
  let failed = 0;

for (const candidate of eligibleActions) {
  const action = await claimOfflineActionForSync(
    candidate.clientUuid,
    candidate.clientUuid === forceRetryClientUuid,
  );

  if (!action) {
    continue;
  }

  try {
      const storedPayload = action.payload as
        PosTransactionParamsPayload & {
          _localDisplay?: unknown;
        };

      // _localDisplay hanya untuk UI lokal. Jangan kirim metadata
      // tersebut ke RPC karena bukan parameter fungsi SQL.
      const payload: PosTransactionParamsPayload = {
        p_customer_id: storedPayload.p_customer_id,
        p_customer_type_used: storedPayload.p_customer_type_used,
        p_items: storedPayload.p_items,
        p_payment_method: storedPayload.p_payment_method,
        p_amount_received: storedPayload.p_amount_received,
      };

      const result = await callRpc<
        RpcCreatePosTransactionParams,
        RpcCreatePosTransactionResult[]
      >(
        supabase,
        'sp_create_pos_transaction',
        {
          ...payload,
          p_client_uuid: action.clientUuid,
        },
      );

      if (!result.success) {
        const retryable = isRetryableSyncError(result.error);

        await updateActionStatus(
          action.clientUuid,
          'failed',
          result.error.message,
          retryable,
        );

        failed++;

        logger.error('Transaksi POS offline gagal disinkronkan', {
          clientUuid: action.clientUuid,
          retryable,
          error: result.error.message,
        });

        continue;
      }

      await removeOfflineAction(action.clientUuid);
      synced++;

      logger.info('Transaksi POS offline berhasil disinkronkan', {
        clientUuid: action.clientUuid,
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Terjadi kesalahan saat sinkronisasi transaksi.';

      await updateActionStatus(
        action.clientUuid,
        'failed',
        message,
        isRetryableSyncError(error),
      );

      failed++;

      logger.error('Kesalahan saat sinkronisasi transaksi POS', {
        clientUuid: action.clientUuid,
        error: message,
      });
    }
  }

  return { synced, failed };
}

export async function syncPosTransactions(
  forceRetryClientUuid?: string,
): Promise<SyncResult> {
  if (
    typeof navigator !== 'undefined' &&
    navigator.locks?.request
  ) {
    return navigator.locks.request(
      SYNC_LOCK_NAME,
      {
        mode: 'exclusive',
        ifAvailable: true,
      },
      async (lock) => {
        if (!lock) {
          return { synced: 0, failed: 0, skipped: true };
        }

        return processPendingTransactions(forceRetryClientUuid);
      },
    );
  }

  if (fallbackSyncInProgress) {
    return { synced: 0, failed: 0, skipped: true };
  }

  fallbackSyncInProgress = true;

  try {
    return await processPendingTransactions(forceRetryClientUuid);
  } finally {
    fallbackSyncInProgress = false;
  }
}