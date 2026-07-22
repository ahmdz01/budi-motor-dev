import Link from 'next/link';
import { Card } from '@/shared/components/Card';
import { Badge } from '@/shared/components/Badge';
import { formatCurrency } from '@/shared/utils/formatCurrency';
import type { TransactionListItem as TransactionListItemType } from '../types';

const sourceLabel: Record<string, string> = { pos: 'POS', service: 'Servis' };

export function TransactionListItem({ transaction }: { transaction: TransactionListItemType }) {
  return (
    <Link href={`/transactions/${transaction.id}`}>
      <Card className="flex items-center justify-between p-3 active:bg-neutral-50">
        <div>
          <p className="text-sm font-medium text-neutral-900">
            {transaction.customer_name ?? 'Pelanggan Umum'}
          </p>
          <p className="text-xs text-neutral-500">
            {new Date(transaction.created_at).toLocaleString('id-ID')}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className="text-sm font-semibold">{formatCurrency(transaction.total_amount)}</span>
          <div className="flex gap-1">
            <Badge variant="accent">{sourceLabel[transaction.source]}</Badge>
            {transaction.status === 'cancelled' && <Badge variant="danger">Dibatalkan</Badge>}
          </div>
        </div>
      </Card>
    </Link>
  );
}
