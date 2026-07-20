'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Plus, Search } from 'lucide-react';
import { Button } from '@/shared/components/Button';
import { cn } from '@/shared/utils/cn';
import { ProductListItem } from '@/features/master-data/components/ProductListItem';
import { useProducts, type StockFilter } from '@/features/master-data/hooks/useProducts';

const filters: { value: StockFilter; label: string }[] = [
  { value: 'all', label: 'Semua' },
  { value: 'low', label: 'Stok Menipis' },
  { value: 'out', label: 'Stok Habis' },
];

export default function InventoryPage() {
  const [search, setSearch] = useState('');
  const [stockFilter, setStockFilter] = useState<StockFilter>('all');
  const { data: products, isLoading, error } = useProducts({ search, stockFilter });

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Barang</h1>
        <Link href="/inventory/new">
          <Button size="md">
            <Plus size={16} /> Tambah
          </Button>
        </Link>
      </div>

      <div className="relative">
        <Search
          size={18}
          className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-neutral-400"
        />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari nama, barcode, atau kode barang..."
          className="focus:border-accent-500 focus:ring-accent-100 w-full rounded-md border border-neutral-300 py-2.5 pr-4 pl-10 text-base focus:ring-2 focus:outline-none"
        />
      </div>

      <div className="flex gap-2 overflow-x-auto">
        {filters.map((f) => (
          <button
            key={f.value}
            onClick={() => setStockFilter(f.value)}
            className={cn(
              'shrink-0 rounded-full px-3 py-1.5 text-xs font-medium',
              stockFilter === f.value
                ? 'bg-accent-600 text-white'
                : 'bg-neutral-100 text-neutral-600'
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {isLoading && (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-lg bg-neutral-100" />
          ))}
        </div>
      )}

      {error && <p className="text-danger-600 text-sm">Gagal memuat data barang.</p>}

      {products && products.length === 0 && (
        <p className="text-center text-sm text-neutral-400">
          {search ? 'Barang tidak ditemukan.' : 'Belum ada barang. Tambahkan yang pertama.'}
        </p>
      )}

      {products && products.length > 0 && (
        <div className="space-y-2">
          {products.map((p) => (
            <ProductListItem key={p.id} product={p} />
          ))}
        </div>
      )}
    </div>
  );
}
