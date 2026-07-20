'use client';

import { useEffect, useState } from 'react';

/**
 * Mendeteksi status koneksi browser secara real-time.
 * Dipakai untuk indikator UI ("Mode Offline") dan nanti untuk
 * memicu proses sinkronisasi otomatis begitu koneksi kembali
 * (logic pemicu sync ada di Phase 6, hook ini hanya deteksi status).
 */
export function useOnlineStatus() {
  // Inisialisasi dari navigator.onLine — tapi hanya valid di client,
  // makanya default 'true' dulu untuk render awal server (hydration
  // safety), lalu langsung dikoreksi via useEffect.
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    setIsOnline(navigator.onLine);

    function handleOnline() {
      setIsOnline(true);
    }
    function handleOffline() {
      setIsOnline(false);
    }

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}
