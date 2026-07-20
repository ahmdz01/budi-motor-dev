'use client';

import { PurchaseForm } from '@/features/purchasing/components/PurchaseForm';

export default function NewPurchasePage() {
  return (
    <div className="p-4">
      <h1 className="mb-4 text-xl font-semibold">Tambah Barang Masuk</h1>
      <PurchaseForm />
    </div>
  );
}