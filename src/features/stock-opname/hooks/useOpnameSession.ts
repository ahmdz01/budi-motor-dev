'use client';

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/shared/lib/supabase/client';
import type { OpnameSessionDetail } from '../types';

export function useOpnameSession(id: string) {
  return useQuery({
    queryKey: ['opname-session', id],
    queryFn: async (): Promise<OpnameSessionDetail> => {
      const supabase = createClient();

      const { data: session, error: sessionError } = await supabase
        .from('stock_opname_sessions')
        .select('id, scope_type, scope_value, started_at, completed_at, status')
        .eq('id', id)
        .single();

      if (sessionError) throw sessionError;

      const { data: items, error: itemsError } = await supabase
        .from('stock_opname_items')
        .select('id, product_id, stok_sistem, stok_fisik, selisih, reason, products(name)')
        .eq('session_id', id);

      if (itemsError) throw itemsError;

      return {
        ...session,
        items: (items ?? []).map((it) => ({
          id: it.id,
          product_id: it.product_id,
          product_name: (it.products as unknown as { name: string } | null)?.name ?? '-',
          stok_sistem: it.stok_sistem,
          stok_fisik: it.stok_fisik,
          selisih: it.selisih,
          reason: it.reason,
        })),
      };
    },
    enabled: !!id,
  });
}
