
'use server';

import { createHmac } from 'node:crypto';
import { isIP } from 'node:net';
import { headers } from 'next/headers';
import { createServiceRoleClient } from '@/shared/lib/supabase/serviceRole';
import { forgotPinSchema } from '../validation/forgotPinSchema';
import { requestPinReset as requestPinResetRpc } from '../api/authRpc';
import { logger } from '@/shared/lib/logger';

type RequestPinResetResult = { message: string };

const GENERIC_MESSAGE =
  'Jika nomor HP terdaftar, permintaan Anda telah dikirim ke Owner/Super Admin.';

export async function requestPinReset(
  formData: FormData,
): Promise<RequestPinResetResult> {
  try {
    const parsed = forgotPinSchema.safeParse({
      phoneNumber: formData.get('phoneNumber'),
    });

    if (!parsed.success) {
      return { message: GENERIC_MESSAGE };
    }

    const requestHeaders = await headers();
    const forwardedFor = requestHeaders.get('x-forwarded-for');
    const candidateIp = forwardedFor?.split(',')[0]?.trim();

    // Di development lokal, gunakan IP loopback jika header tidak ada.
    const clientIp =
      candidateIp && isIP(candidateIp) !== 0
        ? candidateIp
        : process.env.NODE_ENV !== 'production'
          ? '127.0.0.1'
          : null;

    if (!clientIp) {
      logger.error('Reset PIN tidak diproses: IP klien tidak tersedia');
      return { message: GENERIC_MESSAGE };
    }

    const pepper = process.env.PIN_PEPPER;

    if (!pepper) {
      logger.error('Reset PIN tidak diproses: konfigurasi hash tidak tersedia');
      return { message: GENERIC_MESSAGE };
    }

    const ipHash = createHmac('sha256', pepper)
      .update(`budi-motor:pin-reset-rate-limit:v1:${clientIp}`)
      .digest('hex');

    // Service-role client hanya digunakan di sisi server.
    const serviceClient = createServiceRoleClient();

        const result = await requestPinResetRpc(
      serviceClient,
      parsed.data.phoneNumber,
      ipHash,
    );

    if (!result.success) {
      // Jangan mencatat nomor telepon atau pesan error database mentah.
      logger.error('Pengajuan reset PIN gagal diproses', {
        errorCode: result.error.code,
      });
    }

    // Respons tetap generik, termasuk ketika permintaan dibatasi.
    return { message: GENERIC_MESSAGE };
  } catch (err) {
    logger.error('Exception tak terduga di requestPinReset', {
      errorName: err instanceof Error ? err.name : 'UnknownError',
    });

    return { message: GENERIC_MESSAGE };
  }
}
