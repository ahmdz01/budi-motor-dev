'use client';

import { useState } from 'react';
import { Search, Plus } from 'lucide-react';
import { Card } from '@/shared/components/Card';
import { useProducts } from '@/features/master-data/hooks/useProducts';

interface ProductPickerProps {
  onSelect: (product: { id: string; name: string }) => void;
  excludeIds: string[];
}

export function ProductPicker({ onSelect, excludeIds }: ProductPickerProps) {
  const [search, setSearch] = useState('');
  const { data: products } = useProducts({ search });

  const results = (products ?? []).filter((p) => !excludeIds.includes(p.id));

  return (
    <div className="flex flex-col gap-2">
      <div className="relative">
        <Search
          size={18}
          className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-neutral-400"
        />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari barang untuk ditambahkan..."
          className="focus:border-accent-500 focus:ring-accent-100 w-full rounded-md border border-neutral-300 py-2.5 pr-4 pl-10 text-base focus:ring-2 focus:outline-none"
        />
      </div>

      {search.trim() && results.length > 0 && (
        <div className="max-h-48 space-y-1 overflow-y-auto">
          {results.map((p) => (
            <Card
              key={p.id}
              onClick={() => {
                onSelect({ id: p.id, name: p.name });
                setSearch('');
              }}
              className="flex cursor-pointer items-center justify-between p-2.5 active:bg-neutral-50"
            >
              <span className="text-sm text-neutral-900">{p.name}</span>
              <Plus size={16} className="text-accent-600" />
            </Card>
          ))}
        </div>
      )}

      {search.trim() && results.length === 0 && (
        <p className="text-sm text-neutral-400">Barang tidak ditemukan.</p>
      )}
    </div>
  );
}