'use client';

import { RefreshCw } from 'lucide-react';

import { Button } from '@/shared/components/Button';

import { usePendingSyncCount, useSyncOfflineTransactions } from '../hooks/useOfflineSync';

export function PendingSyncBadge() {
  const { data: count = 0 } = usePendingSyncCount();
  const { mutate: sync, isPending } = useSyncOfflineTransactions();

  if (count === 0) return null;

  return (
    <div className="bg-accent-50 text-accent-700 flex items-center justify-between gap-2 px-4 py-2 text-sm font-medium">
      <span>{count} transaksi menunggu sinkronisasi</span>
      <Button
        variant="ghost"
        size="md"
        onClick={() => sync()}
        isLoading={isPending}
        className="px-2 py-1"
      >
        <RefreshCw size={16} />
      </Button>
    </div>
  );
}
