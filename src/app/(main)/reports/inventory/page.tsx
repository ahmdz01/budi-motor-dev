'use client';

import { DateRangeFilter } from '@/features/reports/components/DateRangeFilter';
import { InventorySummaryCards } from '@/features/reports/components/InventorySummaryCards';
import { LowStockTable } from '@/features/reports/components/LowStockTable';
import { StockMovementTable } from '@/features/reports/components/StockMovementTable';
import { useDateRangeState } from '@/features/reports/hooks/useDateRangeState';
import {
  useInventoryReportSummary,
  useLowStockList,
  useStockMovement,
} from '@/features/reports/hooks/useInventoryReport';
import { ReportActions } from '@/features/reports/components/ReportActions';
import { exportToExcel } from '@/features/reports/lib/exportExcel';

export default function InventoryReportPage() {
  const { range, preset, onChange } = useDateRangeState();
  const { data: summary, isLoading } = useInventoryReportSummary();
  const { data: lowStockRows, isLoading: lowStockLoading } = useLowStockList();
  const { data: movementRows, isLoading: movementLoading } = useStockMovement(range);

  return (
    <div className="flex flex-col gap-4 p-4">
      <h1 className="text-xl font-semibold">Laporan Inventory</h1>

      {isLoading && <div className="h-32 animate-pulse rounded-lg bg-neutral-100" />}
      {summary && <InventorySummaryCards summary={summary} />}

      <ReportActions
        isExportDisabled={!summary}
        onExport={() => {
          if (!summary) return;
          exportToExcel(
            [
              {
                name: 'Ringkasan',
                rows: [
                  { Metrik: 'Total Barang Aktif', Nilai: summary.totalProducts },
                  { Metrik: 'Nilai Inventory', Nilai: summary.totalInventoryValue },
                  { Metrik: 'Stok Menipis', Nilai: summary.lowStockCount },
                  { Metrik: 'Stok Habis', Nilai: summary.outOfStockCount },
                ],
              },
              {
                name: 'Perlu Restock',
                rows: (lowStockRows ?? []).map((r) => ({
                  Barang: r.name,
                  Kategori: r.categoryName ?? '-',
                  'Stok Saat Ini': r.totalStock,
                  'Stok Minimum': r.minStock,
                })),
              },
              {
                name: 'Pergerakan Stok',
                rows: (movementRows ?? []).map((r) => ({
                  Barang: r.name,
                  Masuk: r.qtyIn,
                  Keluar: r.qtyOut,
                })),
              },
            ],
            `Laporan-Inventory_${range.from}_${range.to}`
          );
        }}
      />

      <div>
        <h2 className="mb-2 text-sm font-semibold text-neutral-700">Barang Perlu Restock</h2>
        {lowStockLoading ? (
          <div className="h-20 animate-pulse rounded-lg bg-neutral-100" />
        ) : (
          <LowStockTable rows={lowStockRows ?? []} />
        )}
      </div>

      <div>
        <h2 className="mb-2 text-sm font-semibold text-neutral-700">Pergerakan Stok</h2>
        <DateRangeFilter value={range} preset={preset} onChange={onChange} />
        <div className="mt-3">
          {movementLoading ? (
            <div className="h-32 animate-pulse rounded-lg bg-neutral-100" />
          ) : (
            <StockMovementTable rows={movementRows ?? []} />
          )}
        </div>
      </div>
    </div>
  );
}
