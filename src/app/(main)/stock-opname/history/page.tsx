'use client';

import Link from 'next/link';
import { Card } from '@/shared/components/Card';
import { useOpnameSessions } from '@/features/stock-opname/hooks/useOpnameSessions';

export default function StockOpnameHistoryPage() {
  const { data: sessions, isLoading, error } = useOpnameSessions();

  return (
    <div className="flex flex-col gap-4 p-4">
      <h1 className="text-xl font-semibold">Riwayat Stock Opname</h1>

      {isLoading && <p className="text-sm text-neutral-400">Memuat...</p>}
      {error && <p className="text-danger-600 text-sm">Gagal memuat riwayat.</p>}

      {sessions && sessions.length === 0 && (
        <p className="text-center text-sm text-neutral-400">Belum ada riwayat Stock Opname.</p>
      )}

      {sessions && sessions.length > 0 && (
        <div className="space-y-2">
          {sessions.map((s) => (
            <Link key={s.id} href={`/stock-opname/history/${s.id}`}>
              <Card className="flex items-center justify-between p-3 active:bg-neutral-50">
                <div>
                  <p className="text-sm font-medium text-neutral-900">
                    {new Date(s.started_at).toLocaleString('id-ID')}
                  </p>
                  <p className="text-xs text-neutral-500">{s.item_count} barang dicek</p>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
