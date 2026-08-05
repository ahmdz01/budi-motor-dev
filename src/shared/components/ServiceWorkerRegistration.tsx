'use client';

import { useEffect } from 'react';

/**
 * Mendaftarkan service worker minimal (public/sw.js) supaya browser
 * menganggap app "installable" sebagai PWA. TIDAK melakukan apa pun
 * selain registrasi — tidak render UI, tidak ada caching logic di sini.
 *
 * Dipanggil dari root layout (Server Component) supaya layout utama
 * tidak perlu ikut jadi Client Component secara keseluruhan.
 */
export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) {
      return;
    }

    navigator.serviceWorker.register('/sw.js').catch((error) => {
      // Registrasi gagal tidak boleh mengganggu app tetap jalan
      // normal (PWA installability cuma nilai tambah, bukan syarat
      // app bisa dipakai) — cukup dicatat di console untuk debugging.
      console.error('Gagal mendaftarkan service worker:', error);
    });
  }, []);

  return null;
}