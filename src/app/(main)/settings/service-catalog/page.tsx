'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Plus, Search } from 'lucide-react';
import { Button } from '@/shared/components/Button';
import { ServiceCatalogListItem } from '@/features/settings/components/ServiceCatalogListItem';
import { useServiceCatalog } from '@/features/settings/hooks/useServiceCatalog';

export default function ServiceCatalogPage() {
  const [search, setSearch] = useState('');
  const { data: items, isLoading, error } = useServiceCatalog(search);

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Katalog Jasa</h1>
        <Link href="/settings/service-catalog/new">
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
          placeholder="Cari nama jasa..."
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

      {error && <p className="text-danger-600 text-sm">Gagal memuat data katalog jasa.</p>}

      {items && items.length === 0 && (
        <p className="text-center text-sm text-neutral-400">
          {search ? 'Jasa tidak ditemukan.' : 'Belum ada jasa di katalog. Tambahkan yang pertama.'}
        </p>
      )}

      {items && items.length > 0 && (
        <div className="space-y-2">
          {items.map((item) => (
            <ServiceCatalogListItem key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}
