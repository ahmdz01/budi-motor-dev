import { createClient } from '@supabase/supabase-js';

/**
 * Client Supabase dengan service_role key — MELEWATI RLS SEPENUHNYA
 * dan bisa memanggil Supabase Admin API (auth.admin.*).
 *
 * WAJIB HANYA dipakai di dalam file 'use server' (Server Action),
 * TIDAK PERNAH di Client Component, TIDAK PERNAH diekspos ke browser.
 * Kunci ini setara akses penuh ke seluruh database, melewati semua
 * pengecekan role yang sudah dibangun di RLS maupun RPC.
 *
 * Setiap Server Action yang memakai client ini WAJIB melakukan
 * pengecekan role pemanggil secara manual TERLEBIH DAHULU (pakai
 * client biasa/cookie-based untuk baca sesi pemanggil), SEBELUM
 * memakai client ini untuk aksi privileged — client ini sendiri
 * tidak tahu siapa yang memanggilnya.
 */
export function createServiceRoleClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
