'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { generateClientUuid } from '@/shared/lib/offline/clientUuid';
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

interface CreatePosTransactionParams {
  p_client_uuid: string;
  p_customer_id: string | null;
  p_customer_type_used: string;
  p_items: {
    product_id: string;
    qty: number;
  }[];
  p_payment_method: string;
  p_amount_received: number | null;
}

interface CreatePosTransactionResult {
  transaction_id: string;
  total_amount: number;
  change_amount: number;
}

export function useCreatePosTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreatePosTransactionInput) => {
      const supabase = createClient();

      const result = await callRpc<CreatePosTransactionParams, CreatePosTransactionResult[]>(
        supabase,
        'sp_create_pos_transaction',
        {
          p_client_uuid: generateClientUuid(),
          p_customer_id: input.customerId,
          p_customer_type_used: input.customerTypeUsed,
          p_items: input.items.map((item) => ({
            product_id: item.productId,
            qty: item.qty,
          })),
          p_payment_method: input.paymentMethod,
          p_amount_received: input.amountReceived,
        }
      );

      if (!result.success) {
        throw new Error(result.error.message);
      }

      return result.data[0];
    },

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['products-for-sale'],
      });

      queryClient.invalidateQueries({
        queryKey: ['products'],
      });
    },
  });
}
