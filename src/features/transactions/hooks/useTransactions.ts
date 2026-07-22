'use client';

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/shared/lib/supabase/client';
import type { TransactionListItem } from '../types';

// Dibatasi 100 transaksi terbaru untuk MVP — kalau nanti volume data
// membesar, ini kandidat pertama yang butuh pagination (bukan sekarang,
// YAGNI).
export function useTransactions() {
  return useQuery({
    queryKey: ['transactions'],
    queryFn: async (): Promise<TransactionListItem[]> => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('transactions')
        .select(
          'id, customer_type_used, source, total_amount, payment_method, status, created_at, customers(name)'
        )
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      return (data ?? []).map((t) => ({
        id: t.id,
        customer_name: (t.customers as unknown as { name: string } | null)?.name ?? null,
        customer_type_used: t.customer_type_used,
        source: t.source,
        total_amount: t.total_amount,
        payment_method: t.payment_method,
        status: t.status,
        created_at: t.created_at,
      }));
    },
    staleTime: 15 * 1000,
  });
}
