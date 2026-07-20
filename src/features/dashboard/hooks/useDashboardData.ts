'use client';

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/shared/lib/supabase/client';
import { getDashboardMetrics, getRecentTransactions } from '../api/dashboardRpc';

export function useDashboardMetrics() {
  return useQuery({
    queryKey: ['dashboard-metrics'],
    queryFn: async () => {
      const supabase = createClient();
      const result = await getDashboardMetrics(supabase);

      if (!result.success) {
        throw new Error(result.error.message);
      }

      // RPC selalu mengembalikan tepat 1 baris
      return result.data[0];
    },
    // Metrik finansial harus terasa "segar" — staleTime lebih pendek
    // dari default 30 detik global (lihat queryClient.ts).
    staleTime: 15 * 1000,
  });
}

export function useRecentTransactions() {
  return useQuery({
    queryKey: ['recent-transactions'],
    queryFn: async () => {
      const supabase = createClient();
      const result = await getRecentTransactions(supabase, 5);

      if (!result.success) {
        throw new Error(result.error.message);
      }

      return result.data;
    },
    staleTime: 15 * 1000,
  });
}
