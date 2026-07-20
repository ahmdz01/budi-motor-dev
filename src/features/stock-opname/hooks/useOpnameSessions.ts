'use client';

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/shared/lib/supabase/client';
import type { OpnameSessionListItem } from '../types';

export function useOpnameSessions() {
  return useQuery({
    queryKey: ['opname-sessions'],
    queryFn: async (): Promise<OpnameSessionListItem[]> => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('stock_opname_sessions')
        .select(
          'id, scope_type, scope_value, started_at, completed_at, status, stock_opname_items(count)'
        )
        .order('started_at', { ascending: false });

      if (error) throw error;

      return (data ?? []).map((s) => ({
        id: s.id,
        scope_type: s.scope_type,
        scope_value: s.scope_value,
        started_at: s.started_at,
        completed_at: s.completed_at,
        status: s.status,
        item_count:
          (s.stock_opname_items as unknown as { count: number }[] | null)?.[0]?.count ?? 0,
      }));
    },
    staleTime: 30 * 1000,
  });
}
