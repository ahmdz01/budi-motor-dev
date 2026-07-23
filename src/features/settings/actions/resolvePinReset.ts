'use server';

import { z } from 'zod';
import { createClient } from '@/shared/lib/supabase/server';
import { createServiceRoleClient } from '@/shared/lib/supabase/serviceRole';
import { padPin } from '@/features/auth/lib/padPin';
import { logger } from '@/shared/lib/logger';

const resolvePinResetSchema = z.object({
  requestId: z.string().uuid(),
  phoneNumber: z.string().min(9),
  newPin: z
    .string()
    .length(4)
    .regex(/^[0-9]+$/, 'PIN harus 4 digit angka'),
});

type ResolveResult = { success: true } | { success: false; error: string };

export async function resolvePinReset(formData: FormData): Promise<ResolveResult> {
  try {
    const parsed = resolvePinResetSchema.safeParse({
      requestId: formData.get('requestId'),
      phoneNumber: formData.get('phoneNumber'),
      newPin: formData.get('newPin'),
    });

    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message ?? 'Data tidak valid.' };
    }

    const { requestId, phoneNumber, newPin } = parsed.data;

    // 1. Cek role pemanggil lewat sesi cookie biasa.
    const supabase = await createClient();
    const {
      data: { user: caller },
    } = await supabase.auth.getUser();

    const callerRole = caller?.app_metadata?.role_code as string | undefined;

    if (!caller || !callerRole || !['owner', 'admin', 'super_admin'].includes(callerRole)) {
      return { success: false, error: 'Akses ditolak.' };
    }

    // 2. Cari akun tujuan (RLS admin sudah izinkan baca semua users).
    const { data: targetUser, error: findError } = await supabase
      .from('users')
      .select('id')
      .eq('phone_number', phoneNumber)
      .single();

    if (findError || !targetUser) {
      return { success: false, error: 'Akun dengan nomor HP ini tidak ditemukan.' };
    }

    // 3. Baru sekarang pakai service_role — ubah password + buka kunci.
    const serviceClient = createServiceRoleClient();
    const password = padPin(newPin);

    const { error: updateAuthError } = await serviceClient.auth.admin.updateUserById(
      targetUser.id,
      { password }
    );

    if (updateAuthError) {
      logger.error('Gagal update PIN via Admin API', { error: updateAuthError });
      return { success: false, error: 'Gagal mengubah PIN. Coba lagi.' };
    }

    await serviceClient
      .from('users')
      .update({ failed_login_attempts: 0, locked_until: null })
      .eq('id', targetUser.id);

    const { error: resolveError } = await serviceClient
      .from('pin_reset_requests')
      .update({ status: 'resolved', resolved_at: new Date().toISOString(), resolved_by: caller.id })
      .eq('id', requestId);

    if (resolveError) {
      // PIN sudah berhasil diubah — ini bukan kegagalan fatal, cuma
      // catatan administratif yang gagal ditandai. Tetap lapor sukses
      // ke pengguna, tapi log supaya kelihatan di server.
      logger.error('PIN berhasil direset tapi gagal menandai pin_reset_requests selesai', {
        error: resolveError,
        requestId,
      });
    }

    return { success: true };
  } catch (error) {
    logger.error('Error tidak terduga saat reset PIN', { error });
    return { success: false, error: 'Terjadi kesalahan sistem. Coba lagi.' };
  }
}
