import type { SupabaseClient } from '@supabase/supabase-js';
import { callRpc } from '@/shared/lib/supabase/rpc';
import type { Result } from '@/shared/types/result';
import type { DashboardMetrics, RecentTransaction } from '../types';

export async function getDashboardMetrics(
  supabase: SupabaseClient
): Promise<Result<DashboardMetrics[]>> {
  return callRpc<Record<string, never>, DashboardMetrics[]>(supabase, 'get_dashboard_metrics', {});
}

/**
 * Ini BUKAN RPC — query SELECT langsung, dilindungi RLS biasa
 * (lihat penjelasan §2 Langkah 3.3). Sengaja ditaruh di file yang
 * sama supaya developer lain tahu ini bagian dari "API modul
 * Dashboard", meski secara teknis bukan RPC call.
 */
export async function getRecentTransactions(
  supabase: SupabaseClient,
  limit = 5
): Promise<Result<RecentTransaction[]>> {
  const { data, error } = await supabase
    .from('transactions')
    .select('id, total_amount, payment_method, source, created_at')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    return {
      success: false,
      error: { code: error.code, message: 'Gagal memuat aktivitas terakhir.' },
    };
  }

  return { success: true, data: data as RecentTransaction[] };
}
