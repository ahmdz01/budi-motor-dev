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
}

type RpcCreatePosTransactionParams = PosTransactionParamsPayload & {
  p_client_uuid: string;
};

interface RpcCreatePosTransactionResult {
  res_transaction_id: string;
  res_total_amount: number;
  res_change_amount: number;
}

interface CreatePosTransactionResult {
  transaction_id: string | null;
  total_amount: number;
  change_amount: number;
  is_queued: boolean;
}

/**
 * Mendeteksi kegagalan karena offline.
 */
function isOfflineFailure(err: unknown): boolean {
  if (!navigator.onLine) return true;
  if (err instanceof TypeError) return true;
  if (err instanceof Error && /fetch/i.test(err.message)) return true;

  return false;
}

async function queueTransaction(
  payload: PosTransactionParamsPayload,
  items: CartItem[]
): Promise<CreatePosTransactionResult> {
  const clientUuid = await enqueueOfflineAction('pos_transaction', payload);

  logger.info('Transaksi POS di-antre (offline)', {
    clientUuid,
    itemCount: items.length,
  });

  const totalAmount = items.reduce((sum, item) => sum + item.priceSnapshot * item.qty, 0);

  const changeAmount = (payload.p_amount_received ?? totalAmount) - totalAmount;

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
    mutationFn: async (input: CreatePosTransactionInput): Promise<CreatePosTransactionResult> => {
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

      // Jika offline, langsung antrekan transaksi.
      if (!navigator.onLine) {
        return queueTransaction(payload, input.items);
      }

      const supabase = createClient();
      const clientUuid = generateClientUuid();

      try {
        const result = await callRpc<
          RpcCreatePosTransactionParams,
          RpcCreatePosTransactionResult[]
        >(supabase, 'sp_create_pos_transaction', {
          ...payload,
          p_client_uuid: clientUuid,
        });

        if (!result.success) {
          throw new Error(result.error.message);
        }

        const row = result.data[0];

        return {
          transaction_id: row.res_transaction_id,
          total_amount: row.res_total_amount,
          change_amount: row.res_change_amount,
          is_queued: false,
        };
      } catch (err) {
        if (isOfflineFailure(err)) {
          return queueTransaction(payload, input.items);
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
