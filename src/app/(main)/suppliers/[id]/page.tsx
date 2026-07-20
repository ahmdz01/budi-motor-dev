'use client';

import { use } from 'react';
import { Card } from '@/shared/components/Card';
import { Badge } from '@/shared/components/Badge';
import { useSupplier } from '@/features/master-data/hooks/useSupplier';

export default function SupplierDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: supplier, isLoading, error } = useSupplier(id);

  if (isLoading) return <div className="p-4 text-sm text-neutral-400">Memuat...</div>;
  if (error || !supplier)
    return <div className="text-danger-600 p-4 text-sm">Supplier tidak ditemukan.</div>;

  return (
    <div className="flex flex-col gap-4 p-4">
      <div>
        <h1 className="text-xl font-semibold">{supplier.name}</h1>
        <p className="text-sm text-neutral-500">{supplier.phone_number ?? 'Tanpa nomor telepon'}</p>
      </div>

      <Card className="flex flex-col gap-3">
        <div>
          <p className="text-xs text-neutral-500">Alamat</p>
          <p className="text-sm text-neutral-900">{supplier.address ?? '-'}</p>
        </div>
        <div>
          <p className="text-xs text-neutral-500">Termin Pembayaran Default</p>
          <p className="text-sm text-neutral-900">
            {supplier.default_payment_term_days != null
              ? `${supplier.default_payment_term_days} hari`
              : 'Tidak diatur'}
          </p>
        </div>
        <div>
          <p className="text-xs text-neutral-500">Status</p>
          <Badge variant={supplier.status === 'active' ? 'success' : 'neutral'}>
            {supplier.status === 'active' ? 'Aktif' : 'Nonaktif'}
          </Badge>
        </div>
      </Card>
    </div>
  );
}