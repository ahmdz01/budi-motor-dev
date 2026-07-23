import { Card } from '@/shared/components/Card';
import { formatCurrency } from '@/shared/utils/formatCurrency';
import type { InventoryReportSummary } from '../types';

export function InventorySummaryCards({ summary }: { summary: InventoryReportSummary }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <Card>
        <p className="text-xs text-neutral-500">Total Barang Aktif</p>
        <p className="mt-1 text-xl font-semibold">{summary.totalProducts}</p>
      </Card>
      <Card className="bg-accent-50">
        <p className="text-accent-700 text-xs font-medium">Nilai Inventory</p>
        <p className="mt-1 text-lg font-semibold">{formatCurrency(summary.totalInventoryValue)}</p>
      </Card>
      <Card className={summary.lowStockCount > 0 ? 'bg-warning-50' : ''}>
        <p className="text-xs text-neutral-500">Stok Menipis</p>
        <p className="mt-1 text-xl font-semibold">{summary.lowStockCount} barang</p>
      </Card>
      <Card className={summary.outOfStockCount > 0 ? 'bg-danger-50' : ''}>
        <p className="text-xs text-neutral-500">Stok Habis</p>
        <p className="mt-1 text-xl font-semibold">{summary.outOfStockCount} barang</p>
      </Card>
    </div>
  );
}
