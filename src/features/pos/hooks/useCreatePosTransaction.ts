
'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { enqueueOfflineAction } from '@/shared/lib/offline/queue';
import { generateClientUuid } from '@/shared/lib/offline/clientUuid';
import { logger } from '@/shared/lib/logger';
import { createClient } from '@/shared/lib/supabase/client';
import { callRpc } from '@/shared/lib/supabase/rpc';

import type { CartItem, CustomerTypeUsed } from '../stores/useCartStore';

export type PaymentMethod = 'cash' | 'qris' | 'transfer';

interface CreatePosTransactionInput {
  customerId: string | null;
  customerTypeUsed: CustomerTypeUsed;
  items: CartItem[];
  paymentMethod: PaymentMethod;
  amountReceived: number | null;

  /**
   * UUID stabil dari sesi checkout.
   * Jika tidak diberikan, UUID dibuat untuk percobaan mutasi ini.
   */
  clientUuid?: string;
}

export type PosTransactionParamsPayload = {
  p_customer_id: string | null;
  p_customer_type_used: string;
  p_items: {
    product_id: string;
    qty: number;
  }[];
  p_payment_method: string;
  p_amount_received: number | null;
};

type RpcCreatePosTransactionParams = PosTransactionParamsPayload & {
  p_client_uuid: string;
};

interface RpcCreatePosTransactionResult {
  transaction_id: string;
  total_amount: number;
  change_amount: number;
}

interface CreatePosTransactionResult {
  transaction_id: string | null;
  total_amount: number;
  change_amount: number;
  is_queued: boolean;
}

interface RpcErrorLike {
  code?: unknown;
  status?: unknown;
  message?: unknown;
}

/**
 * Mendeteksi kegagalan jaringan tanpa hanya bergantung pada kata
 * "fetch", yang tidak mencakup pesan seperti "Load failed".
 */
function isOfflineFailure(err: unknown): boolean {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return true;
  }

  if (err instanceof TypeError) {
    return true;
  }

  if (err instanceof Error) {
    return /(network|load failed|connection|socket|timed?\s*out|timeout|offline|internet|aborted)/i.test(
      err.message,
    );
  }

  if (!err || typeof err !== 'object') {
    return false;
  }

  const rpcError = err as RpcErrorLike;
  const status =
    typeof rpcError.status === 'number'
      ? rpcError.status
      : null;
  const code =
    typeof rpcError.code === 'string'
      ? rpcError.code.trim()
      : '';
  const message =
    typeof rpcError.message === 'string'
      ? rpcError.message
      : '';

  // Supabase dapat mengembalikan status 0 saat tidak ada respons HTTP.
  if (status === 0) {
    return true;
  }

  // Kode Postgres/PostgREST atau status HTTP biasanya menunjukkan
  // error aplikasi/server, bukan otomatis kegagalan jaringan.
  if (status !== null && status > 0 && code.length > 0) {
    return false;
  }

  if (
    /(network|load failed|connection|socket|timed?\s*out|timeout|offline|internet|aborted)/i.test(
      message,
    )
  ) {
    return true;
  }

  // Respons error tanpa kode/status bisa terjadi ketika koneksi putus
  // sebelum respons Supabase diterima.
  return code.length === 0 && status === null;
}

/**
 * Menyimpan transaksi ke antrean dengan UUID yang sama seperti
 * percobaan online, sehingga retry tidak menjadi transaksi baru.
 */

async function queueTransaction(
  payload: PosTransactionParamsPayload,
  items: CartItem[],
  clientUuid: string,
): Promise<CreatePosTransactionResult> {
  const localDisplay = {
    items: items.map((item) => {
      const displayItem = item as CartItem & {
        name?: string;
        productName?: string;
      };

      return {
        productId: item.productId,
        name:
          displayItem.name ??
          displayItem.productName ??
          item.productId,
        qty: item.qty,
        unitPrice: item.priceSnapshot,
      };
    }),
    totalAmount: items.reduce(
      (sum, item) => sum + item.priceSnapshot * item.qty,
      0,
    ),
  };

  const queuedClientUuid = await enqueueOfflineAction(
    'pos_transaction',
    {
      ...payload,
      _localDisplay: localDisplay,
    },
    clientUuid,
  );

  logger.info('Transaksi POS di-antre (offline)', {
    clientUuid: queuedClientUuid,
    itemCount: items.length,
  });

  const totalAmount = localDisplay.totalAmount;
  const changeAmount =
    (payload.p_amount_received ?? totalAmount) - totalAmount;

  return {
    transaction_id: null,
    total_amount: totalAmount,
    change_amount: changeAmount,
    is_queued: true,
  };
}

export function useCreatePosTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      input: CreatePosTransactionInput,
    ): Promise<CreatePosTransactionResult> => {
      const payload: PosTransactionParamsPayload = {
        p_customer_id: input.customerId,
        p_customer_type_used: input.customerTypeUsed,
        p_items: input.items.map((item) => ({
          product_id: item.productId,
          qty: item.qty,
        })),
        p_payment_method: input.paymentMethod,
        p_amount_received: input.amountReceived,
      };

      // Buat atau gunakan UUID yang diberikan oleh sesi checkout.
      // UUID ini tidak diganti saat transaksi masuk ke antrean offline.
      const clientUuid = input.clientUuid ?? generateClientUuid();

      if (
        typeof navigator !== 'undefined' &&
        !navigator.onLine
      ) {
        return queueTransaction(payload, input.items, clientUuid);
      }

      const supabase = createClient();

      try {
        const result = await callRpc<
          RpcCreatePosTransactionParams,
          RpcCreatePosTransactionResult[]
        >(supabase, 'sp_create_pos_transaction', {
          ...payload,
          p_client_uuid: clientUuid,
        });

        if (!result.success) {
          // Periksa objek error asli sebelum mengubahnya menjadi Error
          // biasa, agar kode/status Supabase tetap tersedia.
          if (isOfflineFailure(result.error)) {
            return queueTransaction(
              payload,
              input.items,
              clientUuid,
            );
          }

          throw new Error(result.error.message);
        }

        const row = result.data[0];

        return {
          transaction_id: row.transaction_id,
          total_amount: row.total_amount,
          change_amount: row.change_amount,
          is_queued: false,
        };
      } catch (err) {
        if (isOfflineFailure(err)) {
          return queueTransaction(
            payload,
            input.items,
            clientUuid,
          );
        }

        throw err;
      }
    },

    onSuccess: (result) => {
      if (result.is_queued) {
        return;
      }

      queryClient.invalidateQueries({
        queryKey: ['products-for-sale'],
      });

      queryClient.invalidateQueries({
        queryKey: ['products'],
      });
    },
  });
}