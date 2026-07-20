import Link from 'next/link';
import { Card } from '@/shared/components/Card';
import { Badge } from '@/shared/components/Badge';
import { formatCurrency } from '@/shared/utils/formatCurrency';
import type { PurchaseListItem as PurchaseListItemType, PaymentStatus } from '../types';

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

export function PurchaseListItem({ purchase }: { purchase: PurchaseListItemType }) {
  return (
    <Link href={`/purchases/${purchase.id}`}>
      <Card className="flex items-center justify-between p-3 active:bg-neutral-50">
        <div>
          <p className="text-sm font-medium text-neutral-900">{purchase.supplier_name}</p>
          <p className="text-xs text-neutral-500">
            {new Date(purchase.purchase_date).toLocaleDateString('id-ID')} ·{' '}
            {formatCurrency(purchase.total_amount)}
          </p>
        </div>
        <Badge variant={statusVariant[purchase.payment_status]}>
          {statusLabel[purchase.payment_status]}
        </Badge>
      </Card>
    </Link>
  );
}