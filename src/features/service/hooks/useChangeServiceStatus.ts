'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/shared/lib/supabase/client';
import { callRpc } from '@/shared/lib/supabase/rpc';
import type { ServiceStatus } from '../types';

interface ChangeStatusInput {
  serviceId: string;
  newStatus: ServiceStatus;
  mechanicId?: string | null;
  reason?: string | null;
}

export function useChangeServiceStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: ChangeStatusInput) => {
      const supabase = createClient();

      const result = await callRpc<
        {
          p_service_id: string;
          p_new_status: string;
          p_mechanic_id: string | null;
          p_reason: string | null;
        },
        { status: string }[]
      >(supabase, 'sp_change_service_status', {
        p_service_id: input.serviceId,
        p_new_status: input.newStatus,
        p_mechanic_id: input.mechanicId ?? null,
        p_reason: input.reason ?? null,
      });

      if (!result.success) throw new Error(result.error.message);

      return result.data[0].status;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['service-detail', variables.serviceId] });
      queryClient.invalidateQueries({ queryKey: ['service-status-history', variables.serviceId] });
      queryClient.invalidateQueries({ queryKey: ['services'] });
    },
  });
}
