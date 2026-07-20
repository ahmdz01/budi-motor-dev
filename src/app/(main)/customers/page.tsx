'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Plus, Search } from 'lucide-react';
import { Button } from '@/shared/components/Button';
import { CustomerListItem } from '@/features/master-data/components/CustomerListItem';
import { useCustomers } from '@/features/master-data/hooks/useCustomers';

export default function CustomersPage() {
  const [search, setSearch] = useState('');
  const { data: customers, isLoading, error } = useCustomers({ search });

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Pelanggan</h1>
        <Link href="/customers/new">
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
          placeholder="Cari nama atau nomor HP..."
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

      {error && <p className="text-danger-600 text-sm">Gagal memuat data pelanggan.</p>}

      {customers && customers.length === 0 && (
        <p className="text-center text-sm text-neutral-400">
          {search ? 'Pelanggan tidak ditemukan.' : 'Belum ada pelanggan. Tambahkan yang pertama.'}
        </p>
      )}

      {customers && customers.length > 0 && (
        <div className="space-y-2">
          {customers.map((c) => (
            <CustomerListItem key={c.id} customer={c} />
          ))}
        </div>
      )}
    </div>
  );
}