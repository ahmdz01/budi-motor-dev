'use client';

import { use, useState } from 'react';
import { Card } from '@/shared/components/Card';
import { Badge } from '@/shared/components/Badge';
import { Button } from '@/shared/components/Button';
import { formatCurrency } from '@/shared/utils/formatCurrency';
import { useTransaction } from '@/features/transactions/hooks/useTransaction';
import { ReturnPanel } from '@/features/returns/components/ReturnPanel';
import type { TransactionItemDetail } from '@/features/transactions/types';

const sourceLabel: Record<string, string> = { pos: 'POS', service: 'Servis' };
const paymentLabel: Record<string, string> = { cash: 'Tunai', qris: 'QRIS', transfer: 'Transfer' };

export default function TransactionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: tx, isLoading, error } = useTransaction(id);
  const [returningItem, setReturningItem] = useState<TransactionItemDetail | null>(null);

  if (isLoading) return <div className="p-4 text-sm text-neutral-400">Memuat...</div>;
  if (error || !tx)
    return <div className="text-danger-600 p-4 text-sm">Transaksi tidak ditemukan.</div>;

  return (
    <div className="flex flex-col gap-4 p-4">
      <div>
        <h1 className="text-xl font-semibold">{tx.customer_name ?? 'Pelanggan Umum'}</h1>
        <p className="text-sm text-neutral-500">
          {new Date(tx.created_at).toLocaleString('id-ID')} · Kasir: {tx.cashier_name}
        </p>
      </div>

      <div className="flex gap-2">
        <Badge variant="accent">{sourceLabel[tx.source]}</Badge>
        <Badge variant="neutral">{paymentLabel[tx.payment_method]}</Badge>
        {tx.status === 'cancelled' && <Badge variant="danger">Dibatalkan</Badge>}
      </div>

      <div className="flex flex-col gap-2">
        {tx.items.map((item) => (
          <Card key={item.id} className="flex items-center justify-between p-3">
            <div>
              <p className="text-sm font-medium text-neutral-900">{item.name_snapshot}</p>
              <p className="text-xs text-neutral-500">
                {item.qty} x {formatCurrency(item.price_snapshot)}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold">{formatCurrency(item.subtotal)}</span>
              {tx.status === 'paid' && (
                <Button variant="secondary" size="md" onClick={() => setReturningItem(item)}>
                  Retur
                </Button>
              )}
            </div>
          </Card>
        ))}
      </div>

      <Card className="flex flex-col gap-2 p-3">
        <div className="flex justify-between text-sm">
          <span className="text-neutral-500">Total</span>
          <span className="font-semibold">{formatCurrency(tx.total_amount)}</span>
        </div>
        {tx.payment_method === 'cash' && tx.amount_received != null && (
          <>
            <div className="flex justify-between text-sm">
              <span className="text-neutral-500">Uang Diterima</span>
              <span>{formatCurrency(tx.amount_received)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-neutral-500">Kembalian</span>
              <span>{formatCurrency(tx.amount_received - tx.total_amount)}</span>
            </div>
          </>
        )}
      </Card>

      {returningItem && (
        <ReturnPanel
          transactionItemId={returningItem.id}
          itemName={returningItem.name_snapshot}
          originalQty={returningItem.qty}
          priceSnapshot={returningItem.price_snapshot}
          itemType={returningItem.item_type}
          onClose={() => setReturningItem(null)}
        />
      )}
    </div>
  );
}
