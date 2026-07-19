'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/shared/lib/supabase/server';
import { loginSchema } from '../validation/loginSchema';
import { phoneToInternalEmail } from '../lib/mapPhoneToEmail';
import { padPin } from '../lib/padPin';
import { checkLoginLockout, recordFailedLogin, resetLoginAttempts } from '../api/authRpc';

type SignInResult = { error: string };

export async function signIn(formData: FormData): Promise<SignInResult> {
  const parsed = loginSchema.safeParse({
    phoneNumber: formData.get('phoneNumber'),
    pin: formData.get('pin'),
  });

  if (!parsed.success) {
    return { error: 'Nomor HP atau PIN tidak valid.' };
  }

  const { phoneNumber, pin } = parsed.data;
  const supabase = await createClient();

  // 1. Cek lockout SEBELUM mencoba autentikasi
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
    return { error: `Akun terkunci sementara. Coba lagi setelah pukul ${until}.` };
  }

  // 2. Coba autentikasi
  const email = phoneToInternalEmail(phoneNumber);
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password: padPin(pin),
  });

  if (error || !data.session) {
    // Sengaja pesan generik — tidak membocorkan mana yang salah (HP/PIN)
    await recordFailedLogin(supabase, phoneNumber);
    return { error: 'Nomor HP atau PIN salah.' };
  }

  // 3. Sukses — reset counter lockout
  await resetLoginAttempts(supabase, phoneNumber);

  // 4. Redirect sesuai role (dibaca dari app_metadata JWT)
  const roleCode = data.session.user.app_metadata?.role_code as string | undefined;

  if (roleCode === 'kasir') redirect('/pos');
  if (roleCode === 'mekanik') redirect('/service');
  redirect('/dashboard');
}
