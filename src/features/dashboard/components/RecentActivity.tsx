'use client';

import { Card } from '@/shared/components/Card';
import { Badge } from '@/shared/components/Badge';
import { formatCurrency } from '@/shared/utils/formatCurrency';
import { useRecentTransactions } from '../hooks/useDashboardData';

const paymentMethodLabel: Record<string, string> = {
  cash: 'Tunai',
  qris: 'QRIS',
  transfer: 'Transfer',
};

export function RecentActivity() {
  const { data, isLoading, error } = useRecentTransactions();

  return (
    <div>
      <h2 className="mb-2 text-sm font-semibold text-neutral-700">Aktivitas Terakhir</h2>

      {isLoading && (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-14 animate-pulse rounded-md bg-neutral-100" />
          ))}
        </div>
      )}

      {error && <p className="text-danger-600 text-sm">Gagal memuat aktivitas terakhir.</p>}

      {data && data.length === 0 && (
        <p className="text-sm text-neutral-400">Belum ada transaksi.</p>
      )}

      {data && data.length > 0 && (
        <div className="space-y-2">
          {data.map((tx) => (
            <Card key={tx.id} className="flex items-center justify-between p-3">
              <div>
                <p className="text-sm font-medium text-neutral-900">
                  {formatCurrency(tx.total_amount)}
                </p>
                <p className="text-xs text-neutral-500">
                  {paymentMethodLabel[tx.payment_method] ?? tx.payment_method}
                  {' · '}
                  {new Date(tx.created_at).toLocaleTimeString('id-ID', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
              <Badge variant={tx.source === 'service' ? 'accent' : 'neutral'}>
                {tx.source === 'service' ? 'Servis' : 'Kasir'}
              </Badge>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
