import type { StockMovementRow } from '../types';

export function StockMovementTable({ rows }: { rows: StockMovementRow[] }) {
  if (rows.length === 0) {
    return <p className="text-sm text-neutral-400">Tidak ada pergerakan stok pada periode ini.</p>;
  }

  return (
    <div className="overflow-hidden rounded-md border border-neutral-200">
      <table className="w-full text-sm">
        <thead className="bg-neutral-50">
          <tr>
            <th className="px-3 py-2 text-left font-medium text-neutral-500">Barang</th>
            <th className="px-3 py-2 text-right font-medium text-neutral-500">Masuk</th>
            <th className="px-3 py-2 text-right font-medium text-neutral-500">Keluar</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.productId} className="border-t border-neutral-100">
              <td className="px-3 py-2">{row.name}</td>
              <td className="text-success-700 px-3 py-2 text-right">+{row.qtyIn}</td>
              <td className="text-danger-700 px-3 py-2 text-right">{row.qtyOut}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
