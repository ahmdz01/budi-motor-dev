'use server';

import { z } from 'zod';
import { createClient } from '@/shared/lib/supabase/server';
import { createServiceRoleClient } from '@/shared/lib/supabase/serviceRole';
import { padPin } from '@/features/auth/lib/padPin';
import { logger } from '@/shared/lib/logger';

const PROCESSING_LEASE_MS = 15 * 60 * 1000;

const resolvePinResetSchema = z
  .object({
    requestId: z.string().uuid(),
    newPin: z.string().length(4).regex(/^[0-9]+$/, 'PIN harus 4 digit angka'),
    confirmPin: z
      .string()
      .length(4)
      .regex(/^[0-9]+$/, 'Konfirmasi PIN harus 4 digit angka'),
  })
  .refine((data) => data.newPin === data.confirmPin, {
    path: ['confirmPin'],
    message: 'Konfirmasi PIN tidak cocok.',
  });

type ResolveResult =
  | { success: true; warning?: string }
  | { success: false; error: string };

type ServiceClient = ReturnType<typeof createServiceRoleClient>;

async function releaseProcessingClaim(
  serviceClient: ServiceClient,
  requestId: string,
  claimedAt: string,
) {
  const { error } = await serviceClient
    .from('pin_reset_requests')
    .update({
      processing_started_at: null,
      processing_by: null,
    })
    .eq('id', requestId)
    .eq('status', 'pending')
    .eq('processing_started_at', claimedAt);

  if (error) {
    logger.error('Gagal melepaskan klaim reset PIN', {
      error,
      requestId,
    });
  }
}

export async function resolvePinReset(
  formData: FormData,
): Promise<ResolveResult> {
  try {
    // Jangan mempercayai nomor HP yang dikirim browser.
    const parsed = resolvePinResetSchema.safeParse({
      requestId: formData.get('requestId'),
      newPin: formData.get('newPin'),
      confirmPin: formData.get('confirmPin'),
    });

    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message ?? 'Data tidak valid.',
      };
    }

    const { requestId, newPin } = parsed.data;

    // 1. Validasi sesi pemohon.
    const supabase = await createClient();
    const {
      data: { user: caller },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !caller) {
      return {
        success: false,
        error: 'Sesi login tidak valid. Silakan login kembali.',
      };
    }

    // Client service-role hanya digunakan di server.
    const serviceClient = createServiceRoleClient();

    // 2. Ambil role pemohon dari database, bukan hanya dari UI/JWT.
    const { data: callerProfile, error: callerError } = await serviceClient
      .from('users')
      .select('id, role_code, status')
      .eq('id', caller.id)
      .maybeSingle();

    if (callerError) {
      logger.error('Gagal memeriksa profil pemohon reset PIN', {
        error: callerError,
        callerId: caller.id,
      });

      return {
        success: false,
        error: 'Gagal memeriksa hak akses. Coba lagi.',
      };
    }

    if (
      !callerProfile ||
      callerProfile.status !== 'active' ||
      !['owner', 'admin', 'super_admin'].includes(callerProfile.role_code)
    ) {
      return { success: false, error: 'Akses ditolak.' };
    }

    // 3. Ambil permintaan berdasarkan ID.
    // Nomor HP target selalu berasal dari database.
    const { data: request, error: requestError } = await serviceClient
      .from('pin_reset_requests')
      .select('id, phone_number, status, processing_started_at')
      .eq('id', requestId)
      .maybeSingle();

    if (requestError) {
      logger.error('Gagal mengambil permintaan reset PIN', {
        error: requestError,
        requestId,
      });

      return {
        success: false,
        error: 'Gagal memeriksa permintaan reset PIN.',
      };
    }

    if (!request || request.status !== 'pending') {
      return {
        success: false,
        error: 'Permintaan tidak ditemukan atau sudah diselesaikan.',
      };
    }

    // 4. Cek apakah permintaan sedang diproses oleh admin lain.
    const staleBefore = new Date(
      Date.now() - PROCESSING_LEASE_MS,
    ).toISOString();

    if (
      request.processing_started_at &&
      new Date(request.processing_started_at).getTime() >
        Date.now() - PROCESSING_LEASE_MS
    ) {
      return {
        success: false,
        error: 'Permintaan ini sedang diproses. Tunggu sebentar sebelum mencoba lagi.',
      };
    }

    // 5. Temukan target melalui nomor yang tersimpan di permintaan.
    const { data: targetUser, error: targetError } = await serviceClient
      .from('users')
      .select('id, phone_number, role_code, status, pin_version')
      .eq('phone_number', request.phone_number)
      .maybeSingle();

    if (targetError) {
      logger.error('Gagal mengambil akun target reset PIN', {
        error: targetError,
        requestId,
      });

      return {
        success: false,
        error: 'Gagal memeriksa akun tujuan.',
      };
    }

    if (!targetUser || targetUser.status !== 'active') {
      return {
        success: false,
        error: 'Akun tujuan tidak ditemukan atau tidak aktif.',
      };
    }

    // Tidak boleh menggunakan jalur reset ini untuk mereset PIN sendiri.
    if (targetUser.id === callerProfile.id) {
      return {
        success: false,
        error: 'Kamu tidak dapat menyetujui reset PIN untuk akun sendiri.',
      };
    }

    // Admin hanya boleh mengatur ulang PIN Kasir/Mekanik.
    // Owner dan Super Admin boleh mengatur ulang role lain,
    // tetapi tetap tidak boleh mereset akun sendiri melalui jalur ini.
    if (
      callerProfile.role_code === 'admin' &&
      !['kasir', 'mekanik'].includes(targetUser.role_code)
    ) {
      return {
        success: false,
        error: 'Admin hanya boleh mereset PIN akun Kasir atau Mekanik.',
      };
    }

    // 6. Klaim secara atomik.
    // Filter status + waktu mencegah dua admin mengklaim
    // permintaan yang sama secara bersamaan.
    const claimedAt = new Date().toISOString();

    const { data: claimedRequest, error: claimError } = await serviceClient
      .from('pin_reset_requests')
      .update({
        processing_started_at: claimedAt,
        processing_by: callerProfile.id,
      })
      .eq('id', requestId)
      .eq('status', 'pending')
      .or(
        `processing_started_at.is.null,processing_started_at.lt.${staleBefore}`,
      )
      .select('id')
      .maybeSingle();

    if (claimError) {
      logger.error('Gagal mengklaim permintaan reset PIN', {
        error: claimError,
        requestId,
      });

      return {
        success: false,
        error: 'Gagal memulai proses reset PIN.',
      };
    }

    if (!claimedRequest) {
      return {
        success: false,
        error: 'Permintaan sedang diproses admin lain atau sudah selesai.',
      };
    }

    // 7. Ubah password menggunakan format HMAC dari K1.
    const password = padPin(targetUser.phone_number, newPin);

    const { error: updateAuthError } =
      await serviceClient.auth.admin.updateUserById(targetUser.id, {
        password,
      });

    if (updateAuthError) {
      logger.error('Gagal memperbarui PIN melalui Auth Admin API', {
        error: updateAuthError,
        targetUserId: targetUser.id,
        requestId,
      });

      await releaseProcessingClaim(serviceClient, requestId, claimedAt);

      return {
        success: false,
        error: 'Gagal mengubah PIN. Permintaan bisa dicoba kembali.',
      };
    }

    // 8. Reset counter lockout dan pastikan format PIN versi 2.
    const { error: resetUserError } = await serviceClient
      .from('users')
      .update({
        failed_login_attempts: 0,
        locked_until: null,
        pin_version: 2,
      })
      .eq('id', targetUser.id);

    if (resetUserError) {
      logger.error('PIN diperbarui tetapi status akun gagal diperbarui', {
        error: resetUserError,
        targetUserId: targetUser.id,
        requestId,
      });

      // Upayakan pencabutan sesi meskipun update profil gagal.
      const { error: revokeError } = await serviceClient.rpc(
        'revoke_user_sessions',
        { p_user_id: targetUser.id },
      );

      if (revokeError) {
        logger.error('Gagal mencabut sesi setelah reset PIN', {
          error: revokeError,
          targetUserId: targetUser.id,
          requestId,
        });
      }

      await releaseProcessingClaim(serviceClient, requestId, claimedAt);

      return {
        success: false,
        error:
          'PIN mungkin sudah berubah, tetapi status akun belum berhasil diperbarui. Periksa akun sebelum memberitahukan PIN baru.',
      };
    }

    // 9. Cabut sesi tersimpan seluruh perangkat target.
    const { error: revokeError } = await serviceClient.rpc(
      'revoke_user_sessions',
      { p_user_id: targetUser.id },
    );

    if (revokeError) {
      logger.error('PIN berubah tetapi pencabutan sesi gagal', {
        error: revokeError,
        targetUserId: targetUser.id,
        requestId,
      });

      await releaseProcessingClaim(serviceClient, requestId, claimedAt);

      return {
        success: false,
        error:
          'PIN mungkin sudah berubah, tetapi sesi lama belum berhasil dicabut. Jangan berikan PIN baru sebelum proses diperiksa.',
      };
    }

    // 10. Catat audit log. Jangan pernah mencatat PIN.
    const { error: auditError } = await serviceClient
      .from('audit_logs')
      .insert({
        entity_type: 'user_pin',
        entity_id: targetUser.id,
        action: 'reset',
        old_value: {
          pin_version: targetUser.pin_version,
          target_role: targetUser.role_code,
        },
        new_value: {
          pin_version: 2,
          reset_method: 'approved_request',
        },
        user_id: callerProfile.id,
      });

    let warning: string | undefined;

    if (auditError) {
      logger.error('Reset PIN berhasil tetapi audit log gagal ditulis', {
        error: auditError,
        targetUserId: targetUser.id,
        requestId,
      });

      warning =
        'PIN berhasil diubah dan sesi lama dicabut, tetapi pencatatan audit gagal.';
    }

    // 11. Selesaikan hanya jika klaim masih milik proses ini.
    const { data: resolvedRequest, error: resolveError } =
      await serviceClient
        .from('pin_reset_requests')
        .update({
          status: 'resolved',
          resolved_at: new Date().toISOString(),
          resolved_by: callerProfile.id,
          processing_started_at: null,
          processing_by: null,
        })
        .eq('id', requestId)
        .eq('status', 'pending')
        .eq('processing_started_at', claimedAt)
        .select('id')
        .maybeSingle();

    if (resolveError || !resolvedRequest) {
      logger.error('PIN berubah tetapi permintaan belum ditandai selesai', {
        error: resolveError,
        targetUserId: targetUser.id,
        requestId,
      });

      return {
        success: true,
        warning:
          'PIN sudah diubah dan sesi lama dicabut, tetapi status permintaan belum tersimpan. Periksa status permintaan sebelum memproses ulang.',
      };
    }

    return { success: true, warning };
  } catch (error) {
    logger.error('Error tidak terduga saat reset PIN', {
      error: error instanceof Error ? error.message : String(error),
    });

    return {
      success: false,
      error: 'Terjadi kesalahan sistem. Periksa status permintaan sebelum mencoba lagi.',
    };
  }
}