'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { createClient } from '@/shared/lib/supabase/client';
import { callRpc } from '@/shared/lib/supabase/rpc';

interface SendEstimateInput {
  serviceId: string;
  notes?: string | null;
}

interface SendEstimateParams {
  p_service_id: string;
  p_notes: string | null;
}

interface SendEstimateResult {
  status: string;
}

export function useSendServiceEstimate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: SendEstimateInput) => {
      const supabase = createClient();

      const result = await callRpc<SendEstimateParams, SendEstimateResult[]>(
        supabase,
        'sp_send_service_estimate',
        {
          p_service_id: input.serviceId,
          p_notes: input.notes ?? null,
        }
      );

      if (!result.success) {
        throw new Error(result.error.message);
      }

      return result.data[0].status;
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
