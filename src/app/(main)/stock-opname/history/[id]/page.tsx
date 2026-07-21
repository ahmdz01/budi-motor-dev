'use client';

import { use } from 'react';
import { Card } from '@/shared/components/Card';
import { Badge } from '@/shared/components/Badge';
import { useOpnameSession } from '@/features/stock-opname/hooks/useOpnameSession';

export default function StockOpnameDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: session, isLoading, error } = useOpnameSession(id);

  if (isLoading) return <div className="p-4 text-sm text-neutral-400">Memuat...</div>;
  if (error || !session)
    return <div className="text-danger-600 p-4 text-sm">Data tidak ditemukan.</div>;

  return (
    <div className="flex flex-col gap-4 p-4">
      <div>
        <h1 suppressHydrationWarning className="text-xl font-semibold">
          {new Date(session.started_at).toLocaleString('id-ID')}
        </h1>
        <p className="text-sm text-neutral-500">{session.items.length} barang dicek</p>
      </div>

      <div className="flex flex-col gap-2">
        {session.items.map((item) => (
          <Card key={item.id} className="flex items-center justify-between p-3">
            <div>
              <p className="text-sm font-medium text-neutral-900">{item.product_name}</p>
              <p className="text-xs text-neutral-500">
                Sistem: {item.stok_sistem} → Fisik: {item.stok_fisik}
              </p>
              {item.reason && <p className="text-xs text-neutral-400">{item.reason}</p>}
            </div>
            {item.selisih !== 0 && (
              <Badge variant={item.selisih > 0 ? 'success' : 'danger'}>
                {item.selisih > 0 ? '+' : ''}
                {item.selisih}
              </Badge>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
