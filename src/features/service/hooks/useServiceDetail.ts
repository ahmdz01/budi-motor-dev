'use client';

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/shared/lib/supabase/client';
import { callRpc } from '@/shared/lib/supabase/rpc';
import type { ServiceDetail } from '../types';

export function useServiceDetail(serviceId: string) {
  return useQuery({
    queryKey: ['service-detail', serviceId],
    queryFn: async (): Promise<ServiceDetail> => {
      const supabase = createClient();
      const result = await callRpc<{ p_service_id: string }, ServiceDetail[]>(
        supabase,
        'get_service_detail',
        { p_service_id: serviceId }
      );

      if (!result.success) throw new Error(result.error.message);
      if (result.data.length === 0) throw new Error('Servis tidak ditemukan.');

      return result.data[0];
    },
    enabled: Boolean(serviceId),
  });
}
