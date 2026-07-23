import Link from 'next/link';
import { Badge } from '@/shared/components/Badge';
import type { LowStockRow } from '../types';

export function LowStockTable({ rows }: { rows: LowStockRow[] }) {
  if (rows.length === 0) {
    return <p className="text-success-600 text-sm">Semua stok dalam kondisi aman.</p>;
  }

  return (
    <div className="flex flex-col gap-2">
      {rows.map((row) => (
        <Link
          key={row.productId}
          href={`/inventory/${row.productId}`}
          className="flex items-center justify-between rounded-md border border-neutral-200 px-3 py-2"
        >
          <div>
            <p className="text-sm font-medium text-neutral-900">{row.name}</p>
            <p className="text-xs text-neutral-500">{row.categoryName ?? 'Tanpa kategori'}</p>
          </div>
          <Badge variant={row.totalStock === 0 ? 'danger' : 'warning'}>
            {row.totalStock} / min {row.minStock}
          </Badge>
        </Link>
      ))}
    </div>
  );
}
