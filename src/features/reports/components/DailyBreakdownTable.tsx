import { formatCurrency } from '@/shared/utils/formatCurrency';
import type { DailyBreakdownRow } from '../types';

export function DailyBreakdownTable({ rows }: { rows: DailyBreakdownRow[] }) {
  if (rows.length === 0) {
    return <p className="text-sm text-neutral-400">Belum ada data pada periode ini.</p>;
  }

  return (
    <div className="overflow-hidden rounded-md border border-neutral-200">
      <table className="w-full text-sm">
        <thead className="bg-neutral-50">
          <tr>
            <th className="px-3 py-2 text-left font-medium text-neutral-500">Tanggal</th>
            <th className="px-3 py-2 text-right font-medium text-neutral-500">Omzet</th>
            <th className="px-3 py-2 text-right font-medium text-neutral-500">Laba</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.date} className="border-t border-neutral-100">
              <td className="px-3 py-2">
                {new Date(row.date).toLocaleDateString('id-ID', {
                  day: 'numeric',
                  month: 'short',
                })}
              </td>
              <td className="px-3 py-2 text-right">{formatCurrency(row.omzet)}</td>
              <td className="text-success-700 px-3 py-2 text-right">{formatCurrency(row.laba)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
