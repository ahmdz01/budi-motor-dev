'use client';

import { use } from 'react';
import { Card } from '@/shared/components/Card';
import { Badge } from '@/shared/components/Badge';
import { formatCurrency } from '@/shared/utils/formatCurrency';
import { usePurchase } from '@/features/purchasing/hooks/usePurchase';
import type { PaymentStatus } from '@/features/purchasing/types';

const statusVariant: Record<PaymentStatus, 'success' | 'warning' | 'danger'> = {
  paid: 'success',
  partial: 'warning',
  unpaid: 'danger',
};

const statusLabel: Record<PaymentStatus, string> = {
  paid: 'Lunas',
  partial: 'Sebagian',
  unpaid: 'Belum Dibayar',
};

export default function PurchaseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: purchase, isLoading, error } = usePurchase(id);

  if (isLoading) return <div className="p-4 text-sm text-neutral-400">Memuat...</div>;
  if (error || !purchase)
    return <div className="text-danger-600 p-4 text-sm">Data pembelian tidak ditemukan.</div>;

  return (
    <div className="flex flex-col gap-4 p-4">
      <div>
        <h1 className="text-xl font-semibold">{purchase.supplier_name}</h1>
        <p className="text-sm text-neutral-500">
          {new Date(purchase.purchase_date).toLocaleDateString('id-ID')}
        </p>
      </div>

      <div className="flex items-center gap-2">
        <Badge variant={statusVariant[purchase.payment_status]}>
          {statusLabel[purchase.payment_status]}
        </Badge>
        <span className="text-sm text-neutral-500">
          Dibayar {formatCurrency(purchase.amount_paid)} dari {formatCurrency(purchase.total_amount)}
        </span>
      </div>

      <div className="flex flex-col gap-2">
        {purchase.items.map((item) => (
          <Card key={item.id} className="flex items-center justify-between p-3">
            <div>
              <p className="text-sm font-medium text-neutral-900">{item.product_name}</p>
              <p className="text-xs text-neutral-500">
                {item.qty} x {formatCurrency(item.unit_price)}
              </p>
            </div>
            <span className="text-sm font-semibold">{formatCurrency(item.subtotal)}</span>
          </Card>
        ))}
      </div>
    </div>
  );
}