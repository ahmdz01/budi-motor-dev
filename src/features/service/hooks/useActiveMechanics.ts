'use client';

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/shared/lib/supabase/client';
import { callRpc } from '@/shared/lib/supabase/rpc';
import type { ActiveMechanic } from '../types';

export function useActiveMechanics(enabled: boolean) {
  return useQuery({
    queryKey: ['active-mechanics'],
    queryFn: async (): Promise<ActiveMechanic[]> => {
      const supabase = createClient();
      const result = await callRpc<Record<string, never>, ActiveMechanic[]>(
        supabase,
        'get_active_mechanics',
        {}
      );

      if (!result.success) throw new Error(result.error.message);

      return result.data;
    },
    enabled,
    staleTime: 60 * 1000,
  });
}
