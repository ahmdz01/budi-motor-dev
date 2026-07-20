'use client';

import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '@/shared/hooks/useOnlineStatus';

/**
 * Banner kecil yang muncul HANYA saat koneksi terputus — sesuai
 * Screen Specification (Kasir): "Kasir harus lihat indikator jelas
 * 'Mode Offline' supaya tidak bingung kenapa laporan belum update
 * di device lain."
 */
export function OfflineIndicator() {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="bg-warning-100 text-warning-700 flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium">
      <WifiOff size={16} />
      Mode Offline — perubahan akan disinkronkan saat online kembali
    </div>
  );
}
