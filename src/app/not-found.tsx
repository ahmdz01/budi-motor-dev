import Link from 'next/link';
import { SearchX } from 'lucide-react';
import { Button } from '@/shared/components/Button';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-4 text-center">
      <div className="rounded-full bg-neutral-100 p-3">
        <SearchX className="text-neutral-500" size={28} />
      </div>
      <div>
        <h2 className="text-lg font-semibold text-neutral-900">Halaman Tidak Ditemukan</h2>
        <p className="mt-1 text-sm text-neutral-500">Halaman yang Anda cari tidak tersedia.</p>
      </div>
      <Link href="/">
        <Button variant="primary">Kembali ke Beranda</Button>
      </Link>
    </div>
  );
}
