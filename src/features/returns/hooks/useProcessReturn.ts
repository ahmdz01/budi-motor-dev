'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { createClient } from '@/shared/lib/supabase/client';
import { callRpc } from '@/shared/lib/supabase/rpc';

interface ProcessReturnInput {
  transactionItemId?: string;
  serviceItemId?: string;
  qtyReturned: number;
  reason: string;
  refundAmount: number;
  restock: boolean;
}

interface ProcessReturnRpcParams {
  p_qty_returned: number;
  p_reason: string;
  p_refund_amount: number;
  p_transaction_item_id: string | null;
  p_service_item_id: string | null;
  p_restock: boolean;
}

interface ProcessReturnRpcResult {
  return_id: string;
}

export function useProcessReturn() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: ProcessReturnInput) => {
      const supabase = createClient();

      const result = await callRpc<ProcessReturnRpcParams, ProcessReturnRpcResult[]>(
        supabase,
        'sp_process_return',
        {
          p_qty_returned: input.qtyReturned,
          p_reason: input.reason,
          p_refund_amount: input.refundAmount,
          p_transaction_item_id: input.transactionItemId ?? null,
          p_service_item_id: input.serviceItemId ?? null,
          p_restock: input.restock,
        }
      );

      if (!result.success) {
        throw new Error(result.error.message);
      }

      return result.data[0].return_id;
    },

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['returned-qty'] });
      queryClient.invalidateQueries({ queryKey: ['transaction'] });
      queryClient.invalidateQueries({ queryKey: ['service-items'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['products-for-sale'] });
    },
  });
}
