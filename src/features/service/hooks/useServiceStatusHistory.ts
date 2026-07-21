'use client';

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/shared/lib/supabase/client';
import { callRpc } from '@/shared/lib/supabase/rpc';
import type { ServiceStatusHistoryEntry } from '../types';

export function useServiceStatusHistory(serviceId: string) {
  return useQuery({
    queryKey: ['service-status-history', serviceId],
    queryFn: async (): Promise<ServiceStatusHistoryEntry[]> => {
      const supabase = createClient();
      const result = await callRpc<{ p_service_id: string }, ServiceStatusHistoryEntry[]>(
        supabase,
        'get_service_status_history',
        { p_service_id: serviceId }
      );

      if (!result.success) throw new Error(result.error.message);

      return result.data;
    },
    enabled: Boolean(serviceId),
  });
}
