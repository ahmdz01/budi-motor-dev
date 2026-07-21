'use client';

import { useEffect, useRef } from 'react';

import { useOnlineStatus } from '@/shared/hooks/useOnlineStatus';

import { useSyncOfflineTransactions } from '../hooks/useOfflineSync';

/**
 * Tanpa tampilan — memicu sinkronisasi otomatis begitu koneksi
 * kembali online, dan sekali saat aplikasi pertama dibuka (menangani
 * sisa antrean dari sesi sebelumnya, mis. tab ditutup di tengah
 * proses sebelum sempat tersinkron).
 */
export function OfflineSyncManager() {
  const isOnline = useOnlineStatus();
  const { mutate: sync } = useSyncOfflineTransactions();
  const hasSyncedOnMount = useRef(false);
  const wasOffline = useRef(false);

  useEffect(() => {
    if (isOnline && !hasSyncedOnMount.current) {
      hasSyncedOnMount.current = true;
      sync();
    }

    if (!isOnline) {
      wasOffline.current = true;
    } else if (wasOffline.current) {
      wasOffline.current = false;
      sync();
    }
  }, [isOnline, sync]);

  return null;
}
