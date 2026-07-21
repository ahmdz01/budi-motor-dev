'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Search, Plus } from 'lucide-react';
import { ServiceListItem } from '@/features/service/components/ServiceListItem';
import { useServices } from '@/features/service/hooks/useServices';

export default function ServicePage() {
  const [search, setSearch] = useState('');
  const { data: services, isLoading, error } = useServices({ search });

  return (
    <div className="flex flex-col gap-4 p-4 pb-24">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Servis</h1>
        <Link href="/service/new">
          <button
            type="button"
            className="bg-accent-600 hover:bg-accent-700 flex items-center gap-1.5 rounded-md px-4 py-2.5 text-sm font-medium text-white"
          >
            <Plus size={16} /> Terima Kendaraan
          </button>
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
          placeholder="Cari nama pelanggan atau plat nomor..."
          className="focus:border-accent-500 focus:ring-accent-100 w-full rounded-md border border-neutral-300 py-2.5 pr-4 pl-10 text-base focus:ring-2 focus:outline-none"
        />
      </div>

      {isLoading && (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-lg bg-neutral-100" />
          ))}
        </div>
      )}

      {error && <p className="text-danger-600 text-sm">Gagal memuat data servis.</p>}

      {services && services.length === 0 && (
        <p className="text-center text-sm text-neutral-400">
          {search ? 'Servis tidak ditemukan.' : 'Belum ada servis. Terima kendaraan pertama Anda.'}
        </p>
      )}

      {services && services.length > 0 && (
        <div className="space-y-2">
          {services.map((s) => (
            <ServiceListItem key={s.id} service={s} />
          ))}
        </div>
      )}
    </div>
  );
}