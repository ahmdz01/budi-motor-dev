'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { generateClientUuid } from '@/shared/lib/offline/clientUuid';
import { createClient } from '@/shared/lib/supabase/client';
import { callRpc } from '@/shared/lib/supabase/rpc';

export type ServicePaymentMethod = 'cash' | 'qris' | 'transfer';

interface ConfirmServicePaymentInput {
  serviceId: string;
  paymentMethod: ServicePaymentMethod;
  amountReceived: number | null;
}

interface ConfirmServicePaymentParams {
  p_service_id: string;
  p_client_uuid: string;
  p_payment_method: string;
  p_amount_received: number | null;
}

interface ConfirmServicePaymentResult {
  transaction_id: string;
  total_amount: number;
  change_amount: number;
}

export function useConfirmServicePayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: ConfirmServicePaymentInput) => {
      const supabase = createClient();

      const result = await callRpc<ConfirmServicePaymentParams, ConfirmServicePaymentResult[]>(
        supabase,
        'sp_confirm_service_payment',
        {
          p_service_id: input.serviceId,
          p_client_uuid: generateClientUuid(),
          p_payment_method: input.paymentMethod,
          p_amount_received: input.amountReceived,
        }
      );

      if (!result.success) {
        throw new Error(result.error.message);
      }

      return result.data[0];
    },

    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['service-detail', variables.serviceId],
      });

      queryClient.invalidateQueries({
        queryKey: ['service-status-history', variables.serviceId],
      });

      queryClient.invalidateQueries({
        queryKey: ['services'],
      });
    },
  });
}
