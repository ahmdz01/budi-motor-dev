import { logger } from '@/shared/lib/logger';
import {
  getPendingActions,
  removeOfflineAction,
  updateActionStatus,
} from '@/shared/lib/offline/queue';
import { createClient } from '@/shared/lib/supabase/client';
import { callRpc } from '@/shared/lib/supabase/rpc';

import type { PosTransactionParamsPayload } from '../hooks/useCreatePosTransaction';

type RpcCreatePosTransactionParams = PosTransactionParamsPayload & {
  p_client_uuid: string;
};

interface RpcCreatePosTransactionResult {
  res_transaction_id: string;
  res_total_amount: number;
  res_change_amount: number;
}

/**
 * Memproses seluruh transaksi POS tertunda secara FIFO (satu per satu)
 * agar urutan transaksi tetap konsisten.
 */
export async function syncPosTransactions(): Promise<{
  synced: number;
  failed: number;
}> {
  const pending = await getPendingActions();

  const posActions = pending.filter(
    (action) => action.entityType === 'pos_transaction' && action.status !== 'syncing'
  );

  const supabase = createClient();

  let synced = 0;
  let failed = 0;

  for (const action of posActions) {
    await updateActionStatus(action.clientUuid, 'syncing');

    const payload = action.payload as PosTransactionParamsPayload;

    const result = await callRpc<RpcCreatePosTransactionParams, RpcCreatePosTransactionResult[]>(
      supabase,
      'sp_create_pos_transaction',
      {
        ...payload,
        p_client_uuid: action.clientUuid,
      }
    );

    if (result.success) {
      await removeOfflineAction(action.clientUuid);

      synced++;

      logger.info('Transaksi POS offline berhasil disinkronkan', {
        clientUuid: action.clientUuid,
      });

      continue;
    }

    await updateActionStatus(action.clientUuid, 'failed', result.error.message);

    failed++;

    logger.error('Transaksi POS offline gagal disinkronkan', {
      clientUuid: action.clientUuid,
      error: result.error.message,
    });
  }

  return {
    synced,
    failed,
  };
}
