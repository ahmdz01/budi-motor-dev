import Link from 'next/link';
import { Store, Users, KeyRound } from 'lucide-react';
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

      <p className="text-sm text-neutral-500">
        Pengaturan harga & ambang batas akan tersedia di sini setelah Langkah 11.3.
      </p>
    </div>
  );
}
