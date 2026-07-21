'use client';

import { useState } from 'react';
import { Search, Plus } from 'lucide-react';
import { Card } from '@/shared/components/Card';
import { Input } from '@/shared/components/Input';
import { Button } from '@/shared/components/Button';
import { formatCurrency } from '@/shared/utils/formatCurrency';
import { useProductsForService } from '../hooks/useProductsForService';
import { useAddServiceItem } from '../hooks/useAddServiceItem';
import type { ServiceDetail } from '../types';

type Tab = 'product' | 'labor';

interface AddServiceItemFormProps {
  service: ServiceDetail;
}

export function AddServiceItemForm({ service }: AddServiceItemFormProps) {
  const [tab, setTab] = useState<Tab>('product');
  const [search, setSearch] = useState('');
  const [pendingProduct, setPendingProduct] = useState<{
    id: string;
    name: string;
    price: number;
    stock: number;
  } | null>(null);
  const [qty, setQty] = useState(1);

  const [laborName, setLaborName] = useState('');
  const [laborPrice, setLaborPrice] = useState(0);
  const [laborQty, setLaborQty] = useState(1);

  const [formError, setFormError] = useState<string | null>(null);

  const { data: products } = useProductsForService(search, service.customer_type_used);
  const addItem = useAddServiceItem();

  function resetProductForm() {
    setSearch('');
    setPendingProduct(null);
    setQty(1);
  }

  function resetLaborForm() {
    setLaborName('');
    setLaborPrice(0);
    setLaborQty(1);
  }

  function handleAddProduct() {
    if (!pendingProduct) return;
    setFormError(null);

    addItem.mutate(
      { serviceId: service.id, itemType: 'product', productId: pendingProduct.id, qty },
      { onSuccess: resetProductForm, onError: (err) => setFormError(err.message) }
    );
  }

  function handleAddLabor() {
    setFormError(null);

    if (laborName.trim().length < 3) return setFormError('Nama jasa minimal 3 karakter.');
    if (laborPrice <= 0) return setFormError('Harga jasa harus lebih dari 0.');

    addItem.mutate(
      {
        serviceId: service.id,
        itemType: 'labor',
        name: laborName,
        price: laborPrice,
        qty: laborQty,
      },
      { onSuccess: resetLaborForm, onError: (err) => setFormError(err.message) }
    );
  }

  return (
    <Card className="flex flex-col gap-3 p-4">
      <p className="text-sm font-medium text-neutral-700">Tambah Item</p>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setTab('product')}
          className={`flex-1 rounded-md border py-2 text-sm font-medium ${
            tab === 'product'
              ? 'border-accent-600 bg-accent-50 text-accent-700'
              : 'border-neutral-300 text-neutral-600'
          }`}
        >
          Barang
        </button>
        <button
          type="button"
          onClick={() => setTab('labor')}
          className={`flex-1 rounded-md border py-2 text-sm font-medium ${
            tab === 'labor'
              ? 'border-accent-600 bg-accent-50 text-accent-700'
              : 'border-neutral-300 text-neutral-600'
          }`}
        >
          Jasa
        </button>
      </div>

      {tab === 'product' && !pendingProduct && (
        <div className="flex flex-col gap-2">
          <div className="relative">
            <Search
              size={18}
              className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-neutral-400"
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari barang..."
              className="focus:border-accent-500 focus:ring-accent-100 w-full rounded-md border border-neutral-300 py-2.5 pr-4 pl-10 text-base focus:ring-2 focus:outline-none"
            />
          </div>

          {search.trim() && products && products.length > 0 && (
            <div className="max-h-48 space-y-1 overflow-y-auto">
              {products.map((p) => (
                <Card
                  key={p.id}
                  onClick={() => {
                    setPendingProduct({
                      id: p.id,
                      name: p.name,
                      price: p.price,
                      stock: p.totalStock,
                    });
                    setSearch('');
                  }}
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

          {search.trim() && products && products.length === 0 && (
            <p className="text-sm text-neutral-400">Barang tidak ditemukan atau stok habis.</p>
          )}
        </div>
      )}

      {tab === 'product' && pendingProduct && (
        <div className="flex flex-col gap-2 rounded-md border border-neutral-200 p-3">
          <p className="text-sm font-medium text-neutral-900">{pendingProduct.name}</p>
          <p className="text-xs text-neutral-500">
            {formatCurrency(pendingProduct.price)} / pcs · Stok {pendingProduct.stock}
          </p>
          <Input
            label="Qty"
            type="number"
            min={1}
            max={pendingProduct.stock}
            value={qty}
            onChange={(e) => setQty(Math.min(Number(e.target.value), pendingProduct.stock))}
          />
          <div className="flex gap-2">
            <Button size="md" isLoading={addItem.isPending} onClick={handleAddProduct}>
              Tambahkan
            </Button>
            <Button size="md" variant="secondary" onClick={resetProductForm}>
              Batal
            </Button>
          </div>
        </div>
      )}

      {tab === 'labor' && (
        <div className="flex flex-col gap-2">
          <Input
            label="Nama Jasa"
            value={laborName}
            onChange={(e) => setLaborName(e.target.value)}
          />
          <Input
            label="Harga"
            type="number"
            min={0}
            value={laborPrice}
            onChange={(e) => setLaborPrice(Number(e.target.value))}
          />
          <Input
            label="Qty"
            type="number"
            min={1}
            value={laborQty}
            onChange={(e) => setLaborQty(Number(e.target.value))}
          />
          <Button size="md" isLoading={addItem.isPending} onClick={handleAddLabor}>
            Tambahkan
          </Button>
        </div>
      )}

      {formError && <p className="text-danger-600 text-sm">{formError}</p>}
    </Card>
  );
}
