'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/shared/lib/supabase/server';
import { createServiceRoleClient } from '@/shared/lib/supabase/serviceRole';
import { loginSchema } from '../validation/loginSchema';
import { phoneToInternalEmail } from '../lib/mapPhoneToEmail';
import { padPin } from '../lib/padPin';
import { padLegacyPin } from '../lib/padLegacyPin';
import {
  checkLoginLockout,
  recordFailedLogin,
  resetLoginAttempts,
} from '../api/authRpc';
import { logger } from '@/shared/lib/logger';

type SignInResult = {
  error: string;
};

export async function signIn(formData: FormData): Promise<SignInResult> {
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
    const serviceClient = createServiceRoleClient();

    // ============================================================
    // 3. AMBIL PROFIL USER
    //
    // Service role digunakan karena proses ini terjadi SEBELUM
    // user berhasil login.
    // ============================================================

    const { data: userProfile, error: userProfileError } =
      await serviceClient
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
        error: 'Nomor HP atau PIN salah.',
      };
    }

    // ============================================================
    // 4. CEK LOCKOUT
    // ============================================================

    const lockoutResult = await checkLoginLockout(
      serviceClient,
      phoneNumber
    );

    if (!lockoutResult.success) {
      logger.error('Gagal memeriksa lockout login', {
        error: lockoutResult.error,
      });

      return {
        error: 'Terjadi kesalahan sistem. Coba lagi.',
      };
    }

    const lockout = lockoutResult.data[0];

    if (lockout?.is_locked && lockout.locked_until) {
      const until = new Date(
        lockout.locked_until
      ).toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
      });

      return {
        error: `Akun terkunci sementara. Coba lagi setelah pukul ${until}.`,
      };
    }

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
        const recordResult = await recordFailedLogin(
          serviceClient,
          phoneNumber
        );

        if (!recordResult.success) {
          logger.error('Gagal mencatat percobaan login gagal', {
            error: recordResult.error,
          });
        }

        return {
          error: 'Nomor HP atau PIN salah.',
        };
      }

      if (error.status === 429) {
        return {
          error:
            'Terlalu banyak percobaan login. Silakan coba lagi nanti.',
        };
      }

      logger.error('Supabase Auth gagal saat login', {
        status: error.status,
        code: error.code,
        message: error.message,
      });

      return {
        error: 'Terjadi kesalahan sistem. Coba lagi.',
      };
    }

    // ============================================================
    // 8. PASTIKAN SESSION TERSEDIA
    // ============================================================

    if (!data.session || !data.user) {
      logger.error(
        'Login berhasil tetapi session/user tidak tersedia'
      );

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

        const { error: migrationError } =
          await serviceClient.auth.admin.updateUserById(
            data.user.id,
            {
              password: newPassword,
            }
          );

        if (migrationError) {
          logger.error(
            'Login berhasil tetapi migrasi password legacy ke HMAC gagal',
            {
              error: migrationError,
              userId: data.user.id,
            }
          );

          // Jangan biarkan user terus menggunakan password legacy.
          // Session yang baru dibuat juga dicabut.
          await supabase.auth.signOut();

          return {
            error:
              'Keamanan akun belum berhasil diperbarui. Silakan coba login kembali.',
          };
        }
      }

      // ----------------------------------------------------------
      // 9B. Tandai user sebagai HMAC version 2
      // ----------------------------------------------------------

      const { error: versionError } = await serviceClient
        .from('users')
        .update({
          pin_version: 2,
        })
        .eq('id', data.user.id)
        .eq('pin_version', 1);

      if (versionError) {
        logger.error(
          'Password sudah menggunakan HMAC tetapi pin_version gagal diperbarui',
          {
            error: versionError,
            userId: data.user.id,
          }
        );

        // Password Auth sudah HMAC.
        // Karena status DB belum berubah, fallback HMAC pada login
        // berikutnya akan tetap membuat user dapat masuk.
        //
        // Namun kita tidak meneruskan login kali ini agar status
        // keamanan dapat diperbaiki terlebih dahulu.
        await supabase.auth.signOut();

        return {
          error:
            'Keamanan akun sedang diperbarui. Silakan login kembali.',
        };
      }

      logger.info('Migrasi password PIN berhasil', {
        userId: data.user.id,
      });
    }

    // ============================================================
    // 10. RESET COUNTER LOGIN
    // ============================================================

    const resetResult = await resetLoginAttempts(
      serviceClient,
      phoneNumber
    );

    if (!resetResult.success) {
      logger.error('Gagal mereset login attempts setelah login berhasil', {
        error: resetResult.error,
        userId: data.user.id,
      });
    }

    // ============================================================
    // 11. REDIRECT BERDASARKAN ROLE
    // ============================================================

    const roleCode = data.session.user.app_metadata?.role_code as
      | string
      | undefined;

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

    if (
      err &&
      typeof err === 'object' &&
      'digest' in err
    ) {
      throw err;
    }

    logger.error('Exception tak terduga di signIn', {
      error: err instanceof Error ? err.message : String(err),
    });

    return {
      error: 'Terjadi kesalahan sistem. Coba lagi.',
    };
  }
}