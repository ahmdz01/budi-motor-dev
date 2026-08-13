import Link from 'next/link';
import { Badge } from '@/shared/components/Badge';
import type { ExpiringBatchRow } from '../hooks/useInventoryReport';

export function ExpiringBatchTable({ rows }: { rows: ExpiringBatchRow[] }) {
  if (rows.length === 0) {
    return <p className="text-success-600 text-sm">Tidak ada barang mendekati kedaluwarsa.</p>;
  }

  return (
    <div className="flex flex-col gap-2">
      {rows.map((row) => (
        <Link
          key={row.batchId}
          href={`/inventory/${row.productId}`}
          className="flex items-center justify-between rounded-md border border-neutral-200 px-3 py-2"
        >
          <div>
            <p className="text-sm font-medium text-neutral-900">{row.productName}</p>
            <p className="text-xs text-neutral-500">
              Sisa {row.qtySisa} pcs — exp {row.expiryDate}
            </p>
          </div>
          <Badge variant={row.daysUntilExpiry <= 7 ? 'danger' : 'warning'}>
            {row.daysUntilExpiry <= 0 ? 'Sudah lewat' : `${row.daysUntilExpiry} hari lagi`}
          </Badge>
        </Link>
      ))}
    </div>
  );
}