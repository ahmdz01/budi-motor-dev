'use client';

import { useState } from 'react';
import { Button } from '@/shared/components/Button';
import { OpnameProductPicker } from './OpnameProductPicker';
import { OpnameItemRow } from './OpnameItemRow';
import { useCreateStockOpname } from '../hooks/useCreateStockOpname';
import type { OpnameCartItem } from '../types';

export function OpnameForm() {
  const [items, setItems] = useState<OpnameCartItem[]>([]);
  const [formError, setFormError] = useState<string | null>(null);
  const createOpname = useCreateStockOpname();

  function addItem(product: {
  id: string;
  name: string;
  totalStock: number;
}) {
  setItems((prev) => {
    // Jangan masukkan barang yang sama dua kali.
    if (prev.some((item) => item.productId === product.id)) {
      return prev;
    }

    return [
      ...prev,
      {
        productId: product.id,
        productName: product.name,
        stokSistem: product.totalStock,
        stokFisik: product.totalStock,
        reason: '',
        hargaBeliBaru: null,
      },
    ];
  });
}

  function updateItem(index: number, updated: OpnameCartItem) {
    setItems((prev) => prev.map((it, i) => (i === index ? updated : it)));
  }

  function removeItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  function handleSubmit() {
    setFormError(null);

    if (items.length === 0) return setFormError('Tambahkan minimal 1 barang untuk dicek.');

    const itemsWithSelisih = items.filter((i) => i.stokFisik !== i.stokSistem);
    if (itemsWithSelisih.length === 0) {
      return setFormError('Tidak ada selisih stok — tidak perlu disimpan.');
    }

    const missingHarga = itemsWithSelisih.find(
      (i) => i.stokFisik > i.stokSistem && (!i.hargaBeliBaru || i.hargaBeliBaru <= 0)
    );
    if (missingHarga) {
      return setFormError(`Isi harga beli untuk "${missingHarga.productName}" (stok lebih).`);
    }

    createOpname.mutate(items);
  }

  return (
    <div className="flex flex-col gap-4">
      <OpnameProductPicker onSelect={addItem} excludeIds={items.map((i) => i.productId)} />

      {items.length > 0 && (
        <div className="flex flex-col gap-2">
          {items.map((item, index) => (
            <OpnameItemRow
              key={item.productId}
              item={item}
              onChange={(updated) => updateItem(index, updated)}
              onRemove={() => removeItem(index)}
            />
          ))}
        </div>
      )}

      {formError && <p className="text-danger-600 text-sm">{formError}</p>}
      {createOpname.error && (
        <p className="text-danger-600 text-sm">{createOpname.error.message}</p>
      )}

      <Button
  onClick={handleSubmit}
  isLoading={createOpname.isPending}
  disabled={items.length === 0 || createOpname.isPending}
>
  Simpan Penyesuaian Stok
</Button>
    </div>
  );
}
