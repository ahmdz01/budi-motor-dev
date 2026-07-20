'use server';

import { createClient } from '@/shared/lib/supabase/server';
import { forgotPinSchema } from '../validation/forgotPinSchema';
import { requestPinReset as requestPinResetRpc } from '../api/authRpc';
import { logger } from '@/shared/lib/logger';

type RequestPinResetResult = { message: string };

export async function requestPinReset(formData: FormData): Promise<RequestPinResetResult> {
  try {
    const parsed = forgotPinSchema.safeParse({
      phoneNumber: formData.get('phoneNumber'),
    });

    // Pesan SELALU sama persis baik nomor terdaftar maupun tidak —
    // mencegah orang menebak-nebak nomor HP mana yang terdaftar
    // di sistem (praktik keamanan standar, sama seperti Login).
    const genericMessage =
      'Jika nomor HP terdaftar, permintaan Anda telah dikirim ke Owner/Super Admin.';

    if (!parsed.success) {
      return { message: genericMessage };
    }

    const supabase = await createClient();
    await requestPinResetRpc(supabase, parsed.data.phoneNumber);

    return { message: genericMessage };
  } catch (err) {
    logger.error('Exception tak terduga di requestPinReset', {
      error: err instanceof Error ? err.message : String(err),
    });
    return {
      message: 'Jika nomor HP terdaftar, permintaan Anda telah dikirim ke Owner/Super Admin.',
    };
  }
}
