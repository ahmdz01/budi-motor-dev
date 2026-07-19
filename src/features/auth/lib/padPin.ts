/**
 * Supabase Auth mensyaratkan password minimal 6 karakter (batas
 * keras platform, tidak bisa diturunkan meski dari dashboard).
 * PIN kita sengaja 4 digit demi kecepatan input pengguna non-teknis
 * (lihat Business Rules — Halaman Login).
 *
 * Solusi: tambahkan suffix TETAP sebelum dikirim ke Supabase Auth.
 * Suffix ini BUKAN lapisan keamanan tambahan (nilainya sama untuk
 * semua pengguna) — murni memenuhi syarat teknis platform.
 * Keamanan sesungguhnya terhadap PIN pendek tetap bertumpu pada
 * rate limiting & lockout (lihat check_login_lockout RPC).
 */
const PIN_PADDING_SUFFIX = '-bm';

export function padPin(pin: string): string {
  return `${pin}${PIN_PADDING_SUFFIX}`;
}