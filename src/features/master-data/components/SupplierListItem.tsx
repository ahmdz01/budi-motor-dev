import Link from 'next/link';
import { Card } from '@/shared/components/Card';
import { Badge } from '@/shared/components/Badge';
import type { Supplier } from '../types';

export function SupplierListItem({ supplier }: { supplier: Supplier }) {
  return (
    <Link href={`/suppliers/${supplier.id}`}>
      <Card className="flex items-center justify-between p-3 active:bg-neutral-50">
        <div>
          <p className="text-sm font-medium text-neutral-900">{supplier.name}</p>
          <p className="text-xs text-neutral-500">{supplier.phone_number ?? 'Tanpa nomor telepon'}</p>
        </div>
        {supplier.default_payment_term_days != null && (
          <Badge variant="accent">{supplier.default_payment_term_days} hari</Badge>
        )}
      </Card>
    </Link>
  );
}