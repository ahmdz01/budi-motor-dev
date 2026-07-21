'use client';

import { useState } from 'react';
import { Search, Plus } from 'lucide-react';
import { Card } from '@/shared/components/Card';
import { formatCurrency } from '@/shared/utils/formatCurrency';
import { useProductsForSale } from '../hooks/useProductsForSale';
import { useCartStore } from '../stores/useCartStore';

export function POSProductSearch() {
  const [search, setSearch] = useState('');
  const customerTypeUsed = useCartStore((s) => s.customerTypeUsed);
  const addItem = useCartStore((s) => s.addItem);
  const { data: products, isLoading } = useProductsForSale(search, customerTypeUsed);

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
          placeholder="Cari / scan barcode barang..."
          className="focus:border-accent-500 focus:ring-accent-100 w-full rounded-md border border-neutral-300 py-2.5 pr-4 pl-10 text-base focus:ring-2 focus:outline-none"
          autoFocus
        />
      </div>

      {isLoading && <p className="text-sm text-neutral-400">Mencari...</p>}

      {products && search.trim() && (
        <div className="max-h-64 space-y-1 overflow-y-auto">
          {products.length === 0 && (
            <p className="text-sm text-neutral-400">Barang tidak ditemukan atau stok habis.</p>
          )}
          {products.map((p) => (
            <Card
              key={p.id}
              onClick={() =>
                addItem({
                  productId: p.id,
                  productName: p.name,
                  priceSnapshot: p.price,
                  qty: 1,
                  stockAvailable: p.totalStock,
                })
              }
              className="flex cursor-pointer items-center justify-between p-2.5 active:bg-neutral-50"
            >
              <div>
                <p className="text-sm text-neutral-900">{p.name}</p>
                <p className="text-xs text-neutral-500">
                  {formatCurrency(p.price)} · Stok {p.totalStock}
                </p>
              </div>
              <Plus size={16} className="text-accent-600" />
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
