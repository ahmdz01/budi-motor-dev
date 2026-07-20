'use client';

import { useState } from 'react';
import { Search } from 'lucide-react';
import { SupplierListItem } from '@/features/master-data/components/SupplierListItem';
import { useSuppliers } from '@/features/master-data/hooks/useSuppliers';

export default function SuppliersPage() {
  const [search, setSearch] = useState('');
  const { data: suppliers, isLoading, error } = useSuppliers({ search });

  return (
    <div className="flex flex-col gap-4 p-4">
      <h1 className="text-xl font-semibold">Supplier</h1>

      <div className="relative">
        <Search
          size={18}
          className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-neutral-400"
        />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari nama supplier..."
          className="focus:border-accent-500 focus:ring-accent-100 w-full rounded-md border border-neutral-300 py-2.5 pr-4 pl-10 text-base focus:ring-2 focus:outline-none"
        />
      </div>

      {isLoading && (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-lg bg-neutral-100" />
          ))}
        </div>
      )}

      {error && <p className="text-danger-600 text-sm">Gagal memuat data supplier.</p>}

      {suppliers && suppliers.length === 0 && (
        <p className="text-center text-sm text-neutral-400">
          {search
            ? 'Supplier tidak ditemukan.'
            : 'Belum ada supplier. Supplier akan tercatat saat input Barang Masuk (Phase 5).'}
        </p>
      )}

      {suppliers && suppliers.length > 0 && (
        <div className="space-y-2">
          {suppliers.map((s) => (
            <SupplierListItem key={s.id} supplier={s} />
          ))}
        </div>
      )}
    </div>
  );
}