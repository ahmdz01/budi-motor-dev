import { Card } from '@/shared/components/Card';
import { formatCurrency } from '@/shared/utils/formatCurrency';
import type { ServiceReportSummary } from '../types';

const statusLabel: Record<string, string> = {
  waiting: 'Menunggu',
  pending_approval: 'Menunggu Persetujuan',
  in_progress: 'Dikerjakan',
  completed: 'Selesai',
  paid: 'Dibayar',
  cancelled: 'Dibatalkan',
};

export function ServiceSummaryCards({ summary }: { summary: ServiceReportSummary }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3">
        <Card className="bg-success-50">
          <p className="text-success-700 text-xs font-medium">Total Servis</p>
          <p className="mt-1 text-xl font-semibold">{summary.totalServices}</p>
        </Card>
        <Card className="bg-accent-50">
          <p className="text-accent-700 text-xs font-medium">Omzet Servis</p>
          <p className="mt-1 text-xl font-semibold">{formatCurrency(summary.totalOmzet)}</p>
        </Card>
        <Card>
          <p className="text-xs text-neutral-500">Rata-rata Pengerjaan</p>
          <p className="mt-1 text-sm font-semibold">
            {summary.avgCompletionHours != null
              ? `${summary.avgCompletionHours.toFixed(1)} jam`
              : '-'}
          </p>
        </Card>
        <Card>
          <p className="text-xs text-neutral-500">Klaim Garansi</p>
          <p className="mt-1 text-sm font-semibold">{summary.warrantyClaimCount} servis</p>
        </Card>
      </div>

      <div>
        <h2 className="mb-2 text-sm font-semibold text-neutral-700">Servis per Status</h2>
        <div className="flex flex-col gap-1.5">
          {Object.entries(summary.countByStatus).map(([status, count]) => (
            <div
              key={status}
              className="flex items-center justify-between rounded-md border border-neutral-200 px-3 py-2 text-sm"
            >
              <span className="text-neutral-600">{statusLabel[status] ?? status}</span>
              <span className="font-medium text-neutral-900">{count}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
