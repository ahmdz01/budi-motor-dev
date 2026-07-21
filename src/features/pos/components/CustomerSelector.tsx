'use client';

import { useState } from 'react';
import { Search, UserPlus, X } from 'lucide-react';
import { Card } from '@/shared/components/Card';
import { Input } from '@/shared/components/Input';
import { Button } from '@/shared/components/Button';
import { useCustomers } from '@/features/master-data/hooks/useCustomers';
import { useQuickCreateCustomer } from '../hooks/useQuickCreateCustomer';
import { useCartStore } from '../stores/useCartStore';

export function CustomerSelector() {
  const [search, setSearch] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');

  const customerId = useCartStore((s) => s.customerId);
  const customerName = useCartStore((s) => s.customerName);
  const setCustomer = useCartStore((s) => s.setCustomer);

  const { data: customers } = useCustomers({ search });
  const quickCreate = useQuickCreateCustomer();

  if (customerId) {
    return (
      <div className="flex items-center justify-between rounded-md border border-neutral-200 p-3">
        <div>
          <p className="text-xs text-neutral-500">Pelanggan</p>
          <p className="text-sm font-medium text-neutral-900">{customerName}</p>
        </div>
        <button type="button" onClick={() => setCustomer(null)} className="text-neutral-400">
          <X size={16} />
        </button>
      </div>
    );
  }

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
          placeholder="Cari pelanggan (opsional — kosongkan untuk transaksi umum)"
          className="focus:border-accent-500 focus:ring-accent-100 w-full rounded-md border border-neutral-300 py-2.5 pr-4 pl-10 text-base focus:ring-2 focus:outline-none"
        />
      </div>

      {search.trim() && customers && customers.length > 0 && (
        <div className="max-h-40 space-y-1 overflow-y-auto">
          {customers.map((c) => (
            <Card
              key={c.id}
              onClick={() => {
                setCustomer({ id: c.id, name: c.name });
                setSearch('');
              }}
              className="cursor-pointer p-2.5 active:bg-neutral-50"
            >
              <p className="text-sm text-neutral-900">{c.name}</p>
              <p className="text-xs text-neutral-500">{c.phone_number}</p>
            </Card>
          ))}
        </div>
      )}

      {search.trim() && customers && customers.length === 0 && !isAdding && (
        <Button
          variant="secondary"
          size="md"
          onClick={() => {
            setIsAdding(true);
            setNewName(search);
          }}
        >
          <UserPlus size={16} /> Tambah &quot;{search}&quot; sebagai pelanggan baru
        </Button>
      )}

      {isAdding && (
        <div className="flex flex-col gap-2 rounded-md border border-neutral-200 p-3">
          <Input
            label="Nama Pelanggan"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
          <Input label="Nomor HP" value={newPhone} onChange={(e) => setNewPhone(e.target.value)} />

          {quickCreate.error && (
            <p className="text-danger-600 text-sm">{quickCreate.error.message}</p>
          )}

          <div className="flex gap-2">
            <Button
              size="md"
              isLoading={quickCreate.isPending}
              onClick={() =>
                quickCreate.mutate(
                  { name: newName, phoneNumber: newPhone },
                  {
                    onSuccess: (customer) => {
                      setCustomer(customer);
                      setIsAdding(false);
                      setSearch('');
                    },
                  }
                )
              }
            >
              Simpan
            </Button>
            <Button variant="secondary" size="md" onClick={() => setIsAdding(false)}>
              Batal
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
