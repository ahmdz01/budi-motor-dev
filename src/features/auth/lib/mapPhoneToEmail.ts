const INTERNAL_EMAIL_DOMAIN = 'budimotor.internal';

/**
 * Mengubah nomor HP jadi format "email" semu untuk Supabase Auth.
 * Pengguna TIDAK PERNAH melihat nilai ini — cukup diketahui
 * bahwa nomor HP mereka dipetakan 1:1 ke identitas internal.
 */
export function phoneToInternalEmail(phoneNumber: string): string {
  const normalized = phoneNumber.replace(/\D/g, '');
  return `${normalized}@${INTERNAL_EMAIL_DOMAIN}`;
}