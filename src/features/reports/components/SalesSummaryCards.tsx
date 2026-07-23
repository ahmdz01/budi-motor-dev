import { Card } from '@/shared/components/Card';
import { formatCurrency } from '@/shared/utils/formatCurrency';
import type { SalesReportSummary } from '../types';

export function SalesSummaryCards({ summary }: { summary: SalesReportSummary }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <Card className="bg-success-50">
        <p className="text-success-700 text-xs font-medium">Total Omzet</p>
        <p className="mt-1 text-xl font-semibold">{formatCurrency(summary.totalOmzet)}</p>
        <p className="text-success-600 mt-0.5 text-xs">{summary.transactionCount} transaksi</p>
      </Card>
      <Card className="bg-accent-50">
        <p className="text-accent-700 text-xs font-medium">Total Laba</p>
        <p className="mt-1 text-xl font-semibold">{formatCurrency(summary.totalLaba)}</p>
      </Card>
      <Card>
        <p className="text-xs text-neutral-500">Kasir (POS)</p>
        <p className="mt-1 text-sm font-semibold">{formatCurrency(summary.posOmzet)}</p>
        <p className="text-xs text-neutral-400">Laba: {formatCurrency(summary.posLaba)}</p>
      </Card>
      <Card>
        <p className="text-xs text-neutral-500">Servis</p>
        <p className="mt-1 text-sm font-semibold">{formatCurrency(summary.serviceOmzet)}</p>
        <p className="text-xs text-neutral-400">Laba: {formatCurrency(summary.serviceLaba)}</p>
      </Card>
    </div>
  );
}
