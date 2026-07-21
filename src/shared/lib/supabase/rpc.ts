import type { SupabaseClient } from '@supabase/supabase-js';
import { ok, fail, type Result } from '@/shared/types/result';
import { logger } from '@/shared/lib/logger';

/**
 * Wrapper generik untuk memanggil RPC Supabase (SECURITY DEFINER
 * functions sesuai Data Dictionary v3 Bagian 3).
 */
export async function callRpc<TArgs extends object, TReturn>(
  supabase: SupabaseClient,
  functionName: string,
  args: TArgs
): Promise<Result<TReturn>> {
  const { data, error } = await supabase.rpc(functionName, args);

  if (error) {
    logger.error(`RPC gagal: ${functionName}`, {
      functionName,
      args,
      supabaseErrorCode: error.code,
      supabaseErrorMessage: error.message,
    });

    return fail(
      error.code ?? 'RPC_ERROR',
      'Terjadi kesalahan saat memproses permintaan. Coba lagi.'
    );
  }

  return ok(data as TReturn);
}
