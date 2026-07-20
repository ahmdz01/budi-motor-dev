'use client';

import Link from 'next/link';
import { Plus } from 'lucide-react';
import { Button } from '@/shared/components/Button';
import { PurchaseListItem } from '@/features/purchasing/components/PurchaseListItem';
import { usePurchases } from '@/features/purchasing/hooks/usePurchases';

export default function PurchasesPage() {
  const { data: purchases, isLoading, error } = usePurchases();

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Barang Masuk</h1>
        <Link href="/purchases/new">
          <Button size="md">
            <Plus size={16} /> Tambah
          </Button>
        </Link>
      </div>

      {isLoading && (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-lg bg-neutral-100" />
          ))}
        </div>
      )}

      {error && <p className="text-danger-600 text-sm">Gagal memuat riwayat pembelian.</p>}

      {purchases && purchases.length === 0 && (
        <p className="text-center text-sm text-neutral-400">Belum ada Barang Masuk yang dicatat.</p>
      )}

      {purchases && purchases.length > 0 && (
        <div className="space-y-2">
          {purchases.map((p) => (
            <PurchaseListItem key={p.id} purchase={p} />
          ))}
        </div>
      )}
    </div>
  );
}