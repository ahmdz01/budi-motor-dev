import { createClient } from '@/shared/lib/supabase/server';
import type { RoleCode } from '@/shared/constants/roleAccess';

export interface CurrentUser {
  id: string;
  name: string;
  phoneNumber: string;
  roleCode: RoleCode;
}

/**
 * Mengambil data pengguna yang sedang login, termasuk nama
 * (dari public.users, bukan sekadar dari JWT) untuk keperluan
 * tampilan seperti header "Halo, [nama]".
 * Return null kalau belum login — pemanggil bertanggung jawab
 * menangani kasus ini (middleware sudah mencegah halaman terproteksi
 * diakses tanpa login, jadi di halaman terproteksi seharusnya
 * ini tidak pernah null, tapi tetap kita tangani untuk keamanan tipe).
 */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from('users')
    .select('name, phone_number, role_code')
    .eq('id', user.id)
    .single();

  if (!profile) return null;

  return {
    id: user.id,
    name: profile.name,
    phoneNumber: profile.phone_number,
    roleCode: profile.role_code as RoleCode,
  };
}
