import { createClient } from '@supabase/supabase-js';

const url = process.env.TEST_SUPABASE_URL;
const anonKey = process.env.TEST_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.TEST_SUPABASE_SERVICE_ROLE_KEY;

if (!url || !anonKey || !serviceRoleKey) {
  throw new Error(
    'Env test belum lengkap. Pastikan .env.test.local berisi TEST_SUPABASE_URL, ' +
      'TEST_SUPABASE_ANON_KEY, dan TEST_SUPABASE_SERVICE_ROLE_KEY dari project budi-motor-dev.'
  );
}

// Client service_role — HANYA untuk admin task (bikin/hapus user test,
// cleanup data test). JANGAN dipakai untuk memanggil RPC finansial
// langsung — service_role JWT tidak punya klaim app_metadata.role_code,
// jadi setiap RPC yang cek role akan SELALU menolaknya.
export const supabaseAdmin = createClient(url, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// Client baru per test — dipakai untuk login sebagai user test
// sungguhan (reuse phoneToInternalEmail/padPin), supaya JWT-nya punya
// klaim role_code yang dicek RPC finansial.
export function createAnonClient() {
  return createClient(url!, anonKey!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}