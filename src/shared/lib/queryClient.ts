import { QueryClient } from '@tanstack/react-query';

/**
 * Konfigurasi default React Query untuk seluruh aplikasi.
 *
 * staleTime 30 detik: data dianggap "masih segar" selama 30 detik
 * setelah diambil — dalam rentang ini, pindah halaman lalu balik
 * lagi TIDAK memicu fetch ulang, terasa instan (Ease of Use).
 * Setelah 30 detik, React Query akan diam-diam refetch di
 * background saat komponen dipakai lagi (tidak memblokir UI).
 *
 * retry 1: jika request gagal (misal koneksi terputus sesaat),
 * coba ulang 1x otomatis sebelum benar-benar dianggap gagal —
 * konsisten dengan prinsip offline-tolerant yang akan kita bangun
 * lebih lanjut di Langkah 10.
 */
export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30 * 1000,
        retry: 1,
        refetchOnWindowFocus: false,
      },
    },
  });
}
