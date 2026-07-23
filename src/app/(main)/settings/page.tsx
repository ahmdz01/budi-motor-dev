import Link from 'next/link';
import { Store, Users, KeyRound, Wrench, SlidersHorizontal, Info } from 'lucide-react';
import { Card } from '@/shared/components/Card';

export default function SettingsPage() {
  return (
    <div className="flex flex-col gap-4 p-4">
      <h1 className="text-xl font-semibold">Pengaturan</h1>

      <Link href="/settings/profile">
        <Card className="flex items-center gap-3 p-3 active:bg-neutral-50">
          <Store size={20} className="text-accent-600" />
          <div>
            <p className="text-sm font-medium text-neutral-900">Profil Toko</p>
            <p className="text-xs text-neutral-500">Nama, alamat, nomor telepon toko</p>
          </div>
        </Card>
      </Link>

      <Link href="/settings/users">
        <Card className="flex items-center gap-3 p-3 active:bg-neutral-50">
          <Users size={20} className="text-accent-600" />
          <div>
            <p className="text-sm font-medium text-neutral-900">Pengguna</p>
            <p className="text-xs text-neutral-500">Daftar akun, tambah pengguna, ubah role</p>
          </div>
        </Card>
      </Link>

      <Link href="/settings/pin-resets">
        <Card className="flex items-center gap-3 p-3 active:bg-neutral-50">
          <KeyRound size={20} className="text-accent-600" />
          <div>
            <p className="text-sm font-medium text-neutral-900">Reset PIN Pengguna</p>
            <p className="text-xs text-neutral-500">Tindak lanjuti permintaan lupa PIN</p>
          </div>
        </Card>
      </Link>

      <Link href="/settings/service-catalog">
        <Card className="flex items-center gap-3 p-3 active:bg-neutral-50">
          <Wrench size={20} className="text-accent-600" />
          <div>
            <p className="text-sm font-medium text-neutral-900">Katalog Jasa</p>
            <p className="text-xs text-neutral-500">Nama jasa, harga default, garansi</p>
          </div>
        </Card>
      </Link>

      <Link href="/settings/thresholds">
        <Card className="flex items-center gap-3 p-3 active:bg-neutral-50">
          <SlidersHorizontal size={20} className="text-accent-600" />
          <div>
            <p className="text-sm font-medium text-neutral-900">Ambang Batas</p>
            <p className="text-xs text-neutral-500">Threshold stock opname & transaksi besar</p>
          </div>
        </Card>
      </Link>

      <Link href="/settings/about">
        <Card className="flex items-center gap-3 p-3 active:bg-neutral-50">
          <Info size={20} className="text-accent-600" />
          <div>
            <p className="text-sm font-medium text-neutral-900">Tentang Aplikasi</p>
            <p className="text-xs text-neutral-500">Info versi & fitur aplikasi</p>
          </div>
        </Card>
      </Link>
    </div>
  );
}
