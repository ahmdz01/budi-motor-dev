'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/shared/lib/supabase/server';
import { loginSchema } from '../validation/loginSchema';
import { phoneToInternalEmail } from '../lib/mapPhoneToEmail';
import { padPin } from '../lib/padPin';
import { checkLoginLockout, recordFailedLogin, resetLoginAttempts } from '../api/authRpc';
import { logger } from '@/shared/lib/logger';

type SignInResult = { error: string };

export async function signIn(formData: FormData): Promise<SignInResult> {
  try {
    const parsed = loginSchema.safeParse({
      phoneNumber: formData.get('phoneNumber'),
      pin: formData.get('pin'),
    });

    if (!parsed.success) {
      return { error: 'Nomor HP atau PIN tidak valid.' };
    }

    const { phoneNumber, pin } = parsed.data;
    const supabase = await createClient();

    const lockoutResult = await checkLoginLockout(supabase, phoneNumber);

    if (!lockoutResult.success) {
      return { error: lockoutResult.error.message };
    }

    const lockout = lockoutResult.data[0];
    if (lockout?.is_locked && lockout.locked_until) {
      const until = new Date(lockout.locked_until).toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
      });
      return {
        error: `Akun terkunci sementara. Coba lagi setelah pukul ${until}.`,
      };
    }

    const email = phoneToInternalEmail(phoneNumber);
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password: padPin(pin),
    });

    if (error || !data.session) {
      await recordFailedLogin(supabase, phoneNumber);
      return { error: 'Nomor HP atau PIN salah.' };
    }

    await resetLoginAttempts(supabase, phoneNumber);

    const roleCode = data.session.user.app_metadata?.role_code as string | undefined;

    if (roleCode === 'kasir') redirect('/pos');
    if (roleCode === 'mekanik') redirect('/service');
    redirect('/dashboard');
  } catch (err) {
    // PENTING: redirect() Next.js bekerja dengan cara "melempar"
    // exception khusus secara internal — try-catch di sini TIDAK
    // boleh menelan itu, jadi kita cek dan lempar ulang.
    if (err && typeof err === 'object' && 'digest' in err) {
      throw err; // ini redirect() Next.js, biarkan lanjut normal
    }

    logger.error('Exception tak terduga di signIn', {
      error: err instanceof Error ? err.message : String(err),
    });
    return { error: 'Terjadi kesalahan sistem. Coba lagi.' };
  }
}
