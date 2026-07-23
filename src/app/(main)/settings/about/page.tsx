'use client';

import { Card } from '@/shared/components/Card';
import { useStoreSettings } from '@/features/settings/hooks/useStoreSettings';

const APP_VERSION = '1.0.0';

const features = [
  'Kasir (POS) — dengan mode offline saat internet terputus',
  'Inventory — stok barang & harga pokok metode FIFO',
  'Servis Kendaraan — dari terima kendaraan sampai pembayaran',
  'Hutang Supplier — pencatatan & pembayaran barang masuk',
  'Laporan Keuangan — penjualan, laba, performa mekanik, nilai stok',
];

export default function AboutPage() {
  const { data: settings } = useStoreSettings();

  return (
    <div className="flex flex-col gap-4 p-4">
      <h1 className="text-xl font-semibold">Tentang Aplikasi</h1>

      <Card className="flex flex-col items-center gap-1 p-6 text-center">
        <p className="text-lg font-semibold text-neutral-900">Budi Motor</p>
        <p className="text-sm text-neutral-500">Aplikasi Manajemen Bengkel</p>
        <p className="mt-2 text-xs text-neutral-400">Versi {APP_VERSION}</p>
      </Card>

      {settings && (
        <Card className="p-4">
          <p className="text-xs text-neutral-500">Dipakai oleh</p>
          <p className="text-sm font-medium text-neutral-900">{settings.store_name}</p>
          {settings.address && <p className="text-sm text-neutral-600">{settings.address}</p>}
          {settings.phone_number && (
            <p className="text-sm text-neutral-600">{settings.phone_number}</p>
          )}
        </Card>
      )}

      <Card className="p-4">
        <p className="mb-2 text-sm font-medium text-neutral-700">Fitur Utama</p>
        <ul className="flex flex-col gap-1.5">
          {features.map((f) => (
            <li key={f} className="text-sm text-neutral-600">
              • {f}
            </li>
          ))}
        </ul>
      </Card>

      <p className="px-2 text-center text-xs text-neutral-400">
        Dibuat khusus untuk kebutuhan bengkel keluarga — kalau ada kendala atau masukan, hubungi
        Admin/Owner toko ini.
      </p>
    </div>
  );
}
