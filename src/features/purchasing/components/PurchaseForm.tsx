'use client';

import { useMemo, useState } from 'react';
import { Input } from '@/shared/components/Input';
import { Button } from '@/shared/components/Button';
import { Badge } from '@/shared/components/Badge';
import { CategoryBrandCombobox } from '@/features/master-data/components/CategoryBrandCombobox';
import { useSuppliers, useCreateSupplier } from '@/features/master-data/hooks/useSuppliers';
import { formatCurrency } from '@/shared/utils/formatCurrency';
import { ProductPicker } from './ProductPicker';
import { PurchaseItemRow } from './PurchaseItemRow';
import { useCreatePurchase } from '../hooks/usePurchaseMutations';
import type { PurchaseCartItem, PaymentStatus } from '../types';

const todayIso = () => new Date().toISOString().slice(0, 10);

const paymentLabel: Record<PaymentStatus, string> = {
  paid: 'Lunas',
  partial: 'Sebagian',
  unpaid: 'Belum Dibayar',
};

const paymentVariant: Record<PaymentStatus, 'success' | 'warning' | 'danger'> = {
  paid: 'success',
  partial: 'warning',
  unpaid: 'danger',
};

export function PurchaseForm() {
  const { data: suppliers = [] } = useSuppliers();
  const createSupplier = useCreateSupplier();
  const createPurchase = useCreatePurchase();

  const [supplierId, setSupplierId] = useState<string | null>(null);
  const [purchaseDate, setPurchaseDate] = useState(todayIso());
  const [dueDate, setDueDate] = useState('');
  const [items, setItems] = useState<PurchaseCartItem[]>([]);
  const [amountPaid, setAmountPaid] = useState(0);
  const [formError, setFormError] = useState<string | null>(null);

  const total = useMemo(() => items.reduce((sum, i) => sum + i.qty * i.unitPrice, 0), [items]);

  const paymentStatus: PaymentStatus =
    total > 0 && amountPaid >= total ? 'paid' : amountPaid > 0 ? 'partial' : 'unpaid';

  function addItem(product: { id: string; name: string }) {
    setItems((prev) => [
      ...prev,
      { productId: product.id, productName: product.name, qty: 1, unitPrice: 0 },
    ]);
  }

  function updateItem(index: number, updated: PurchaseCartItem) {
    setItems((prev) => prev.map((it, i) => (i === index ? updated : it)));
  }

  function removeItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  function handleSubmit() {
    setFormError(null);

    if (!supplierId) return setFormError('Pilih supplier terlebih dahulu.');
    if (items.length === 0) return setFormError('Tambahkan minimal 1 barang.');
    if (items.some((i) => i.qty <= 0 || i.unitPrice <= 0)) {
      return setFormError('Qty dan harga beli setiap barang harus lebih dari 0.');
    }
    if (amountPaid < 0 || amountPaid > total) {
      return setFormError('Jumlah dibayar tidak valid.');
    }

    createPurchase.mutate({
      supplierId,
      purchaseDate,
      items,
      amountPaid,
      dueDate: dueDate || null,
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <CategoryBrandCombobox
        label="Supplier"
        options={suppliers}
        value={supplierId}
        onChange={setSupplierId}
        onCreateNew={(name) => createSupplier.mutateAsync(name)}
        isCreating={createSupplier.isPending}
      />

      <Input
        label="Tanggal Pembelian"
        type="date"
        value={purchaseDate}
        onChange={(e) => setPurchaseDate(e.target.value)}
      />

      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium text-neutral-700">Barang</p>
        <ProductPicker onSelect={addItem} excludeIds={items.map((i) => i.productId)} />

        {items.length > 0 && (
          <div className="flex flex-col gap-2">
            {items.map((item, index) => (
              <PurchaseItemRow
                key={item.productId}
                item={item}
                onChange={(updated) => updateItem(index, updated)}
                onRemove={() => removeItem(index)}
              />
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between rounded-md border border-neutral-200 p-3">
        <span className="text-sm font-medium text-neutral-700">Total Pembelian</span>
        <span className="text-lg font-semibold">{formatCurrency(total)}</span>
      </div>

      <Input
        label="Jumlah Dibayar Sekarang (dari Dana Restock)"
        type="number"
        min={0}
        value={amountPaid}
        onChange={(e) => setAmountPaid(Number(e.target.value))}
      />

      {total > 0 && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-neutral-500">Status Pembayaran:</span>
          <Badge variant={paymentVariant[paymentStatus]}>{paymentLabel[paymentStatus]}</Badge>
        </div>
      )}

      {paymentStatus !== 'paid' && (
        <Input
          label="Jatuh Tempo (opsional — kosongkan untuk hitung otomatis dari termin supplier)"
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
        />
      )}

      {formError && <p className="text-danger-600 text-sm">{formError}</p>}
      {createPurchase.error && (
        <p className="text-danger-600 text-sm">{createPurchase.error.message}</p>
      )}

      <Button onClick={handleSubmit} isLoading={createPurchase.isPending}>
        Simpan Barang Masuk
      </Button>
    </div>
  );
}