'use client';

import { TransactionListItem } from '@/features/transactions/components/TransactionListItem';
import { useTransactions } from '@/features/transactions/hooks/useTransactions';

export default function TransactionsPage() {
  const { data: transactions, isLoading, error } = useTransactions();

  return (
    <div className="flex flex-col gap-4 p-4">
      <h1 className="text-xl font-semibold">Riwayat Transaksi</h1>

      {isLoading && (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-lg bg-neutral-100" />
          ))}
        </div>
      )}

      {error && <p className="text-danger-600 text-sm">Gagal memuat riwayat transaksi.</p>}

      {transactions && transactions.length === 0 && (
        <p className="text-center text-sm text-neutral-400">Belum ada transaksi.</p>
      )}

      {transactions && transactions.length > 0 && (
        <div className="space-y-2">
          {transactions.map((t) => (
            <TransactionListItem key={t.id} transaction={t} />
          ))}
        </div>
      )}
    </div>
  );
}
