'use server';

import { randomUUID } from 'node:crypto';
import { redirect } from 'next/navigation';
import { createClient } from '@/shared/lib/supabase/server';
import { createServiceRoleClient } from '@/shared/lib/supabase/serviceRole';
import { loginSchema } from '../validation/loginSchema';
import { phoneToInternalEmail } from '../lib/mapPhoneToEmail';
import { padPin } from '../lib/padPin';
import { padLegacyPin } from '../lib/padLegacyPin';
import { beginLoginAttempt, finishLoginAttempt } from '../api/authRpc';
import { logger } from '@/shared/lib/logger';

type SignInResult = {
  error: string;
};

const GENERIC_LOGIN_ERROR = 'Nomor HP atau PIN salah, atau login sedang dibatasi. Coba lagi nanti.';

export async function signIn(formData: FormData): Promise<SignInResult> {
  let serviceClient: ReturnType<typeof createServiceRoleClient> | null = null;
  let activeAttempt: { phoneNumber: string; attemptId: string } | null = null;

  const finalizeAttempt = async (
    outcome: 'success' | 'invalid_credentials' | 'aborted'
  ): Promise<boolean> => {
    const pending = activeAttempt;
    if (!pending || !serviceClient) return false;

    // Jika respons jaringan gagal, reservasi database akan kedaluwarsa otomatis.
    activeAttempt = null;
    const result = await finishLoginAttempt(
      serviceClient,
      pending.phoneNumber,
      pending.attemptId,
      outcome
    );

    if (!result.success) {
      logger.error('Gagal menyelesaikan reservasi login', {
        errorCode: result.error.code,
        outcome,
      });
      return false;
    }

    if (!result.data[0]?.applied) {
      logger.error('Reservasi login sudah tidak berlaku saat diselesaikan', {
        outcome,
      });
      return false;
    }

    return true;
  };

  try {
    // ============================================================
    // 1. VALIDASI INPUT
    // ============================================================

    const parsed = loginSchema.safeParse({
      phoneNumber: formData.get('phoneNumber'),
      pin: formData.get('pin'),
    });

    if (!parsed.success) {
      return {
        error: 'Nomor HP atau PIN tidak valid.',
      };
    }

    const { phoneNumber, pin } = parsed.data;

    // ============================================================
    // 2. CLIENT
    // ============================================================

    const supabase = await createClient();
    serviceClient = createServiceRoleClient();
    const adminClient = serviceClient;

    // ============================================================
    // 3. AMBIL PROFIL USER
    //
    // Service role digunakan karena proses ini terjadi SEBELUM
    // user berhasil login.
    // ============================================================

    const { data: userProfile, error: userProfileError } = await adminClient
      .from('users')
      .select('id, pin_version, status')
      .eq('phone_number', phoneNumber)
      .maybeSingle();

    if (userProfileError) {
      logger.error('Gagal mengambil profil user saat login', {
        error: userProfileError,
      });

      return {
        error: 'Terjadi kesalahan sistem. Coba lagi.',
      };
    }

    // Jangan membocorkan apakah nomor HP terdaftar.
    if (!userProfile || userProfile.status !== 'active') {
      return {
        error: GENERIC_LOGIN_ERROR,
      };
    }

    // ============================================================
    // 4. RESERVASI LOGIN ATOMIK
    //
    // RPC mengunci baris user dan membuat reservasi bertoken. Permintaan
    // login paralel untuk akun yang sama ditolak sementara sehingga tidak
    // semuanya lolos sebelum kegagalan pertama tercatat.
    // ============================================================

    const attemptId = randomUUID();
    const beginResult = await beginLoginAttempt(adminClient, phoneNumber, attemptId);

    if (!beginResult.success) {
      logger.error('Gagal memulai reservasi login', {
        errorCode: beginResult.error.code,
      });
      return { error: 'Terjadi kesalahan sistem. Coba lagi.' };
    }

    const attempt = beginResult.data[0];

    if (!attempt) {
      logger.error('RPC reservasi login tidak mengembalikan status');
      return { error: 'Terjadi kesalahan sistem. Coba lagi.' };
    }

    // Gunakan respons generik untuk lockout, reservasi yang sedang dipakai,
    // dan PIN salah agar status akun tidak mudah ditebak melalui pesan error.
    if (!attempt.can_proceed) {
      return { error: GENERIC_LOGIN_ERROR };
    }

    activeAttempt = { phoneNumber, attemptId };

    // ============================================================
    // 5. LOGIN
    //
    // pin_version:
    //
    // 1 = password legacy: PIN-bm
    // 2 = HMAC-SHA256(PIN_PEPPER, phone:PIN)
    //
    // User lama akan dimigrasikan otomatis setelah berhasil login.
    // ============================================================

    const email = phoneToInternalEmail(phoneNumber);

    let password = padPin(phoneNumber, pin);
    let usingLegacyPassword = false;

    if (userProfile.pin_version === 1) {
      password = padLegacyPin(pin);
      usingLegacyPassword = true;
    }

    let { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    // ============================================================
    // 6. FALLBACK UNTUK USER YANG PASSWORD SUDAH HMAC
    //
    // Ini menangani kondisi:
    //
    // Auth password sudah HMAC
    // tetapi pin_version di public.users masih 1
    //
    // Misalnya update DB pin_version gagal setelah password berhasil
    // dimigrasikan.
    // ============================================================

    if (
      error &&
      usingLegacyPassword &&
      error.status === 400 &&
      error.code === 'invalid_credentials'
    ) {
      const hmacPassword = padPin(phoneNumber, pin);

      const hmacResult = await supabase.auth.signInWithPassword({
        email,
        password: hmacPassword,
      });

      data = hmacResult.data;
      error = hmacResult.error;

      if (!error && data.session) {
        usingLegacyPassword = false;

        logger.info('User berhasil login menggunakan password HMAC', {
          userId: data.user?.id,
        });
      }
    }

    // ============================================================
    // 7. HANDLE ERROR LOGIN
    // ============================================================

    if (error) {
      if (error.status === 400 && error.code === 'invalid_credentials') {
        await finalizeAttempt('invalid_credentials');

        return {
          error: GENERIC_LOGIN_ERROR,
        };
      }

      if (error.status === 429) {
        await finalizeAttempt('aborted');
        return {
          error: 'Terlalu banyak percobaan login. Silakan coba lagi nanti.',
        };
      }

      await finalizeAttempt('aborted');
      logger.error('Supabase Auth gagal saat login', {
        status: error.status,
        code: error.code,
      });

      return {
        error: 'Terjadi kesalahan sistem. Coba lagi.',
      };
    }

    // ============================================================
    // 8. PASTIKAN SESSION TERSEDIA
    // ============================================================

    if (!data.session || !data.user) {
      await finalizeAttempt('aborted');
      logger.error('Login berhasil tetapi session/user tidak tersedia');

      return {
        error: 'Terjadi kesalahan sistem. Coba lagi.',
      };
    }

    // ============================================================
    // 9. MIGRASI PASSWORD LEGACY → HMAC
    //
    // Hanya dilakukan jika:
    //
    // pin_version === 1
    // dan login legacy berhasil.
    //
    // Jika fallback HMAC berhasil, password sudah HMAC sehingga
    // kita hanya perlu memastikan pin_version menjadi 2.
    // ============================================================

    if (userProfile.pin_version === 1) {
      // ----------------------------------------------------------
      // 9A. Jika masih menggunakan password legacy,
      //     ubah password Auth menjadi HMAC.
      // ----------------------------------------------------------

      if (usingLegacyPassword) {
        const newPassword = padPin(phoneNumber, pin);

        const { error: migrationError } = await adminClient.auth.admin.updateUserById(
          data.user.id,
          {
            password: newPassword,
          }
        );

        if (migrationError) {
          logger.error('Login berhasil tetapi migrasi password legacy ke HMAC gagal', {
            error: migrationError,
            userId: data.user.id,
          });

          // Jangan biarkan user terus menggunakan password legacy.
          // Session yang baru dibuat juga dicabut.
          await supabase.auth.signOut();
          await finalizeAttempt('aborted');

          return {
            error: 'Keamanan akun belum berhasil diperbarui. Silakan coba login kembali.',
          };
        }
      }

      // ----------------------------------------------------------
      // 9B. Tandai user sebagai HMAC version 2
      // ----------------------------------------------------------

      const { error: versionError } = await adminClient
        .from('users')
        .update({
          pin_version: 2,
        })
        .eq('id', data.user.id)
        .eq('pin_version', 1);

      if (versionError) {
        logger.error('Password sudah menggunakan HMAC tetapi pin_version gagal diperbarui', {
          error: versionError,
          userId: data.user.id,
        });

        // Password Auth sudah HMAC.
        // Karena status DB belum berubah, fallback HMAC pada login
        // berikutnya akan tetap membuat user dapat masuk.
        //
        // Namun kita tidak meneruskan login kali ini agar status
        // keamanan dapat diperbaiki terlebih dahulu.
        await supabase.auth.signOut();
        await finalizeAttempt('aborted');

        return {
          error: 'Keamanan akun sedang diperbarui. Silakan login kembali.',
        };
      }

      logger.info('Migrasi password PIN berhasil', {
        userId: data.user.id,
      });
    }

    // 10. SELESAIKAN RESERVASI LOGIN BERHASIL
    //
    // Counter kegagalan dan last_login_at diperbarui atomik di RPC.
    // Jika finalisasi tidak terkonfirmasi, jangan pertahankan session.
    // ============================================================

    const attemptFinalized = await finalizeAttempt('success');

    if (!attemptFinalized) {
      await supabase.auth.signOut();
      return {
        error: 'Login belum dapat diverifikasi. Silakan coba lagi.',
      };
    }

    // ============================================================
    // 11. REDIRECT BERDASARKAN ROLE
    // ============================================================

    const roleCode = data.session.user.app_metadata?.role_code as string | undefined;

    if (roleCode === 'kasir') {
      redirect('/pos');
    }

    if (roleCode === 'mekanik') {
      redirect('/service');
    }

    redirect('/dashboard');
  } catch (err) {
    // ============================================================
    // 12. JANGAN TELAN REDIRECT NEXT.JS
    // ============================================================

    if (err && typeof err === 'object' && 'digest' in err) {
      throw err;
    }

    await finalizeAttempt('aborted');

    logger.error('Exception tak terduga di signIn', {
      errorName: err instanceof Error ? err.name : 'UnknownError',
    });

    return {
      error: 'Terjadi kesalahan sistem. Coba lagi.',
    };
  }
}
