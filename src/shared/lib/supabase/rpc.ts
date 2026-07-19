import type { SupabaseClient } from '@supabase/supabase-js';
import { ok, fail, type Result } from '@/shared/types/result';

/**
 * Wrapper generik untuk memanggil RPC Supabase (SECURITY DEFINER
 * functions sesuai Data Dictionary v3 Bagian 3).
 *
 * Menerima instance Supabase client sebagai parameter (bukan
 * membuat client sendiri) — supaya function ini bisa dipakai baik
 * dari Server Action (createClient dari server.ts) maupun dari
 * Client Component (createClient dari client.ts), tanpa duplikasi
 * logic. Ini prinsip Dependency Injection sederhana.
 */
export async function callRpc<TArgs extends Record<string, unknown>, TReturn>(
  supabase: SupabaseClient,
  functionName: string,
  args: TArgs
): Promise<Result<TReturn>> {
  const { data, error } = await supabase.rpc(functionName, args);

  if (error) {
    // Di Langkah 9 (Error Handling & Logging), baris ini akan
    // diperluas untuk mengirim error ke logging service.
    // Untuk sekarang, kita normalisasi jadi pesan generik yang aman
    // ditampilkan — detail teknis (error.message asli) TIDAK
    // diteruskan ke pengguna.
    return fail(
      error.code ?? 'RPC_ERROR',
      'Terjadi kesalahan saat memproses permintaan. Coba lagi.'
    );
  }

  return ok(data as TReturn);
}
