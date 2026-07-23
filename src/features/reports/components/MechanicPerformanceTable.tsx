import type { MechanicPerformanceRow } from '../types';

export function MechanicPerformanceTable({ rows }: { rows: MechanicPerformanceRow[] }) {
  if (rows.length === 0) {
    return <p className="text-sm text-neutral-400">Belum ada servis dengan mekanik ditugaskan.</p>;
  }

  return (
    <div className="overflow-hidden rounded-md border border-neutral-200">
      <table className="w-full text-sm">
        <thead className="bg-neutral-50">
          <tr>
            <th className="px-3 py-2 text-left font-medium text-neutral-500">Mekanik</th>
            <th className="px-3 py-2 text-right font-medium text-neutral-500">Jumlah Servis</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.mechanicId} className="border-t border-neutral-100">
              <td className="px-3 py-2">{row.mechanicName}</td>
              <td className="px-3 py-2 text-right font-medium">{row.serviceCount}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
