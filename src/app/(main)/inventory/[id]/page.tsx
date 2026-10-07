'use client';

import { use } from 'react';
import Link from 'next/link';
import { Pencil, Trash2 } from 'lucide-react';
import { Card } from '@/shared/components/Card';
import { Button } from '@/shared/components/Button';
import { formatCurrency } from '@/shared/utils/formatCurrency';
import { useProduct } from '@/features/master-data/hooks/useProduct';
import { useDeactivateProduct } from '@/features/master-data/hooks/useProductMutations';
import { BarcodePrint } from '@/features/master-data/components/BarcodePrint';

const priceLabel: Record<string, string> = {
  general: 'Harga Umum',
  service: 'Harga Servis',
  workshop: 'Harga Bengkel',
};

export default function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: product, isLoading, error } = useProduct(id);

  const deactivateProduct = useDeactivateProduct();

  function handleDeactivate() {
    if (!product) return;
    const confirmed = window.confirm(
      `Nonaktifkan "${product.name}"? Barang ini akan hilang dari daftar Inventory, tapi riwayat transaksi lama tetap aman.`
    );
    if (!confirmed) return;
    deactivateProduct.mutate(id);
  }

  if (isLoading) return <div className="p-4 text-sm text-neutral-400">Memuat...</div>;
  if (error || !product)
    return <div className="text-danger-600 p-4 text-sm">Barang tidak ditemukan.</div>;

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold">{product.name}</h1>
          <p className="text-sm text-neutral-500">
            {product.location_label ?? 'Tanpa lokasi'} · Barcode {product.barcode}
          </p>
        </div>
        <div className="flex gap-2">
  <BarcodePrint
    barcode={product.barcode ?? product.sku}
    name={product.name}
  />

  <Link href={`/inventory/${id}/edit`}>
    <Button variant="secondary" size="md">
      <Pencil size={16} /> Edit
    </Button>
  </Link>

  <Button
    variant="secondary"
    size="md"
    onClick={handleDeactivate}
    isLoading={deactivateProduct.isPending}
  >
    <Trash2 size={16} /> Nonaktifkan
  </Button>
</div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Card>
          <p className="text-xs text-neutral-500">Stok</p>
          <p className="mt-1 text-lg font-semibold">{product.total_stock} pcs</p>
        </Card>
        {product.prices.map((price) => (
          <Card key={price.price_type}>
            <p className="text-xs text-neutral-500">{priceLabel[price.price_type]}</p>
            <p className="mt-1 text-lg font-semibold">{formatCurrency(price.price_value)}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}
