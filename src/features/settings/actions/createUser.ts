'use server';

import { createClient } from '@/shared/lib/supabase/server';
import { createServiceRoleClient } from '@/shared/lib/supabase/serviceRole';
import { createUserSchema } from '../validation/createUserSchema';
import { phoneToInternalEmail } from '@/features/auth/lib/mapPhoneToEmail';
import { padPin } from '@/features/auth/lib/padPin';
import { logger } from '@/shared/lib/logger';

type CreateUserResult = { success: true } | { success: false; error: string };

// Admin biasa TIDAK boleh membuat akun setingkat/di atasnya sendiri —
// mencegah privilege escalation.
const ROLES_ADMIN_CAN_ASSIGN = ['kasir', 'mekanik'];

export async function createUser(formData: FormData): Promise<CreateUserResult> {
  try {
    const parsed = createUserSchema.safeParse({
      name: formData.get('name'),
      phoneNumber: formData.get('phoneNumber'),
      pin: formData.get('pin'),
      roleCode: formData.get('roleCode'),
    });

    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message ?? 'Data tidak valid.' };
    }

    const { name, phoneNumber, pin, roleCode } = parsed.data;

    // 1. Cek role PEMANGGIL lewat sesi cookie biasa — service_role
    // client di bawah TIDAK tahu siapa yang memanggilnya.
    const supabase = await createClient();
    const {
      data: { user: caller },
    } = await supabase.auth.getUser();

    const callerRole = caller?.app_metadata?.role_code as string | undefined;

    if (!caller || !callerRole || !['owner', 'admin', 'super_admin'].includes(callerRole)) {
      return { success: false, error: 'Akses ditolak.' };
    }

    if (callerRole === 'admin' && !ROLES_ADMIN_CAN_ASSIGN.includes(roleCode)) {
      return {
        success: false,
        error: 'Admin hanya boleh membuat akun Kasir atau Mekanik. Hubungi Owner untuk role lain.',
      };
    }

    // 2. Baru sekarang pakai service_role — setelah caller terverifikasi berhak.
    const serviceClient = createServiceRoleClient();
    const email = phoneToInternalEmail(phoneNumber);
    const password = padPin(phoneNumber, pin);

    const { data: newAuthUser, error: authError } = await serviceClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      app_metadata: { role_code: roleCode },
    });

    if (authError || !newAuthUser.user) {
      logger.error('Gagal membuat auth user', { error: authError });
      const message = authError?.message.includes('already been registered')
        ? 'Nomor HP ini sudah terdaftar.'
        : 'Gagal membuat akun. Coba lagi.';
      return { success: false, error: message };
    }

    const { error: profileError } = await serviceClient.from('users').insert({
  id: newAuthUser.user.id,
  phone_number: phoneNumber,
  name,
  role_code: roleCode,
  pin_version: 2,
});

    if (profileError) {
      // Rollback: batalkan auth user supaya tidak ada akun "setengah jadi"
      // (auth user ada tapi tanpa profil public.users).
      await serviceClient.auth.admin.deleteUser(newAuthUser.user.id);
      logger.error('Gagal membuat profil user, auth user di-rollback', { error: profileError });
      return { success: false, error: 'Gagal menyimpan data pengguna. Coba lagi.' };
    }

    return { success: true };
  } catch (error) {
    logger.error('Error tidak terduga saat membuat user', { error });
    return { success: false, error: 'Terjadi kesalahan sistem. Coba lagi.' };
  }
}
