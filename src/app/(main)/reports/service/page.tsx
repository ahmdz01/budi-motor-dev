'use client';

import { DateRangeFilter } from '@/features/reports/components/DateRangeFilter';
import { ServiceSummaryCards } from '@/features/reports/components/ServiceSummaryCards';
import { MechanicPerformanceTable } from '@/features/reports/components/MechanicPerformanceTable';
import { useDateRangeState } from '@/features/reports/hooks/useDateRangeState';
import {
  useServiceReport,
  useMechanicPerformance,
} from '@/features/reports/hooks/useServiceReport';
import { ReportActions } from '@/features/reports/components/ReportActions';
import { exportToExcel } from '@/features/reports/lib/exportExcel';

export default function ServiceReportPage() {
  const { range, preset, onChange } = useDateRangeState();
  const { data: summary, isLoading, error } = useServiceReport(range);
  const { data: mechanicRows, isLoading: mechanicLoading } = useMechanicPerformance(range);

  return (
    <div className="flex flex-col gap-4 p-4">
      <h1 className="text-xl font-semibold">Laporan Servis</h1>

      <DateRangeFilter value={range} preset={preset} onChange={onChange} />
      <ReportActions
        isExportDisabled={!summary}
        onExport={() => {
          if (!summary) return;
          exportToExcel(
            [
              {
                name: 'Ringkasan',
                rows: [
                  { Metrik: 'Total Servis', Nilai: summary.totalServices },
                  { Metrik: 'Omzet Servis', Nilai: summary.totalOmzet },
                  {
                    Metrik: 'Rata-rata Pengerjaan (jam)',
                    Nilai: summary.avgCompletionHours?.toFixed(1) ?? '-',
                  },
                  { Metrik: 'Klaim Garansi', Nilai: summary.warrantyClaimCount },
                ],
              },
              {
                name: 'Servis per Status',
                rows: Object.entries(summary.countByStatus).map(([status, count]) => ({
                  Status: status,
                  Jumlah: count,
                })),
              },
              {
                name: 'Performa Mekanik',
                rows: (mechanicRows ?? []).map((m) => ({
                  Mekanik: m.mechanicName,
                  'Jumlah Servis': m.serviceCount,
                })),
              },
            ],
            `Laporan-Servis_${range.from}_${range.to}`
          );
        }}
      />

      {isLoading && <div className="h-40 animate-pulse rounded-lg bg-neutral-100" />}
      {error && <p className="text-danger-600 text-sm">Gagal memuat laporan.</p>}
      {summary && <ServiceSummaryCards summary={summary} />}

      <div>
        <h2 className="mb-2 text-sm font-semibold text-neutral-700">Performa Mekanik</h2>
        {mechanicLoading ? (
          <div className="h-24 animate-pulse rounded-lg bg-neutral-100" />
        ) : (
          <MechanicPerformanceTable rows={mechanicRows ?? []} />
        )}
      </div>
    </div>
  );
}
