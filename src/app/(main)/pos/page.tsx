'use client';

import { useState } from 'react';
import { useCartStore } from '@/features/pos/stores/useCartStore';
import { CustomerTypeSelector } from '@/features/pos/components/CustomerTypeSelector';
import { CustomerSelector } from '@/features/pos/components/CustomerSelector';
import { POSProductSearch } from '@/features/pos/components/POSProductSearch';
import { CartItemRow } from '@/features/pos/components/CartItemRow';
import { CheckoutPanel } from '@/features/pos/components/CheckoutPanel';
import { Button } from '@/shared/components/Button';
import { formatCurrency } from '@/shared/utils/formatCurrency';

export default function PosPage() {
  const items = useCartStore((s) => s.items);
  const total = items.reduce((sum, i) => sum + i.priceSnapshot * i.qty, 0);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);

  return (
    <div className="flex flex-col gap-4 p-4 pb-32">
      <h1 className="text-xl font-semibold">Kasir</h1>

      <CustomerTypeSelector />
      <CustomerSelector />
      <POSProductSearch />

      <div className="flex flex-col gap-1">
        <p className="text-sm font-medium text-neutral-700">Keranjang</p>
        {items.length === 0 && (
          <p className="text-sm text-neutral-400">Belum ada barang di keranjang.</p>
        )}
        {items.map((item) => (
          <CartItemRow key={item.productId} item={item} />
        ))}
      </div>

      {items.length > 0 && (
        <div className="fixed right-0 bottom-16 left-0 border-t border-neutral-200 bg-white p-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-medium text-neutral-700">Total</span>
            <span className="text-lg font-semibold">{formatCurrency(total)}</span>
          </div>
          <Button className="w-full" onClick={() => setIsCheckoutOpen(true)}>
            Bayar
          </Button>
        </div>
      )}

      {isCheckoutOpen && <CheckoutPanel onClose={() => setIsCheckoutOpen(false)} />}
    </div>
  );
}
