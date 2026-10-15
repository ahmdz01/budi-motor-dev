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
 * rate limiting & reservasi login atomik (lihat begin_login_attempt RPC).
 */
import 'server-only';

import { createHmac } from 'crypto';

function getPinPepper(): string {
  const pepper = process.env.PIN_PEPPER;

  if (!pepper) {
    throw new Error('PIN_PEPPER belum dikonfigurasi.');
  }

  return pepper;
}

export function padPin(phoneNumber: string, pin: string): string {
  const normalizedPhone = phoneNumber.replace(/\D/g, '');

  return createHmac('sha256', getPinPepper()).update(`${normalizedPhone}:${pin}`).digest('hex');
}
