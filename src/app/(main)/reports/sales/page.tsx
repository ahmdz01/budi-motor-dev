'use client';

import { DateRangeFilter } from '@/features/reports/components/DateRangeFilter';
import { SalesSummaryCards } from '@/features/reports/components/SalesSummaryCards';
import { DailyBreakdownTable } from '@/features/reports/components/DailyBreakdownTable';
import { useDateRangeState } from '@/features/reports/hooks/useDateRangeState';
import { useSalesReport, useDailyBreakdown } from '@/features/reports/hooks/useSalesReport';
import { ReportActions } from '@/features/reports/components/ReportActions';
import { exportToExcel } from '@/features/reports/lib/exportExcel';

export default function SalesReportPage() {
  const { range, preset, onChange } = useDateRangeState();
  const { data: summary, isLoading, error } = useSalesReport(range);
  const { data: dailyRows, isLoading: dailyLoading } = useDailyBreakdown(range);

  return (
    <div className="flex flex-col gap-4 p-4">
      <h1 className="text-xl font-semibold">Laporan Penjualan & Laba</h1>

      <DateRangeFilter value={range} preset={preset} onChange={onChange} />
      <ReportActions
        isExportDisabled={!summary || !dailyRows}
        onExport={() => {
          if (!summary || !dailyRows) return;
          exportToExcel(
            [
              {
                name: 'Ringkasan',
                rows: [
                  { Metrik: 'Total Omzet', Nilai: summary.totalOmzet },
                  { Metrik: 'Total Laba', Nilai: summary.totalLaba },
                  { Metrik: 'Omzet POS', Nilai: summary.posOmzet },
                  { Metrik: 'Laba POS', Nilai: summary.posLaba },
                  { Metrik: 'Omzet Servis', Nilai: summary.serviceOmzet },
                  { Metrik: 'Laba Servis', Nilai: summary.serviceLaba },
                  { Metrik: 'Jumlah Transaksi', Nilai: summary.transactionCount },
                ],
              },
              {
                name: 'Rincian Harian',
                rows: dailyRows.map((r) => ({
                  Tanggal: r.date,
                  Omzet: r.omzet,
                  Laba: r.laba,
                })),
              },
            ],
            `Laporan-Penjualan_${range.from}_${range.to}`
          );
        }}
      />

      {isLoading && (
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-lg bg-neutral-100" />
          ))}
        </div>
      )}

      {error && <p className="text-danger-600 text-sm">Gagal memuat laporan.</p>}

      {summary && <SalesSummaryCards summary={summary} />}

      <div>
        <h2 className="mb-2 text-sm font-semibold text-neutral-700">Rincian Harian</h2>
        {dailyLoading ? (
          <div className="h-32 animate-pulse rounded-lg bg-neutral-100" />
        ) : (
          <DailyBreakdownTable rows={dailyRows ?? []} />
        )}
      </div>
    </div>
  );
}
