'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { createClient } from '@/shared/lib/supabase/client';
import { callRpc } from '@/shared/lib/supabase/rpc';

interface ApproveEstimateInput {
  serviceId: string;
  approved: boolean;
  reason?: string | null;
}

interface ApproveEstimateParams {
  p_service_id: string;
  p_approved: boolean;
  p_reason: string | null;
}

interface ApproveEstimateResult {
  status: string;
}

export function useApproveServiceEstimate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: ApproveEstimateInput) => {
      const supabase = createClient();

      const result = await callRpc<ApproveEstimateParams, ApproveEstimateResult[]>(
        supabase,
        'sp_approve_service_estimate',
        {
          p_service_id: input.serviceId,
          p_approved: input.approved,
          p_reason: input.reason ?? null,
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
