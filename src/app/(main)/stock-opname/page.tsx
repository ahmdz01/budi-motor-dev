'use client';

import Link from 'next/link';
import { History } from 'lucide-react';
import { OpnameForm } from '@/features/stock-opname/components/OpnameForm';

export default function StockOpnamePage() {
  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Stock Opname</h1>
        <Link
          href="/stock-opname/history"
          className="text-accent-600 flex items-center gap-1 text-sm"
        >
          <History size={16} /> Riwayat
        </Link>
      </div>
      <p className="text-sm text-neutral-500">
        Cari barang, isi hasil hitung fisik, lalu simpan. Stok sistem akan otomatis disesuaikan.
      </p>
      <OpnameForm />
    </div>
  );
}
