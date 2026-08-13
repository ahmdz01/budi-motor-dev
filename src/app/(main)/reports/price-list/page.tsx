'use client';

import { Printer } from 'lucide-react';
import { Button } from '@/shared/components/Button';
import { usePriceList } from '@/features/reports/hooks/usePriceList';
import { formatCurrency } from '@/shared/utils/formatCurrency';

export default function PriceListPage() {
  const { data: rows, isLoading } = usePriceList();

  // Kelompokkan per kategori supaya enak dibaca saat dicetak —
  // pelanggan/Bapak biasanya cari per jenis barang, bukan alfabet
  // campur semua kategori.
  const grouped = new Map<string, typeof rows>();
  for (const row of rows ?? []) {
    const key = row.categoryName ?? 'Tanpa Kategori';
    const list = grouped.get(key) ?? [];
    list.push(row);
    grouped.set(key, list);
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center justify-between print:hidden">
        <h1 className="text-xl font-semibold">Daftar Harga</h1>
        <Button variant="secondary" size="md" onClick={() => window.print()}>
          <Printer size={16} /> Cetak
        </Button>
      </div>

      {isLoading && <div className="h-40 animate-pulse rounded-lg bg-neutral-100" />}

      {Array.from(grouped.entries()).map(([category, items]) => (
        <div key={category}>
          <h2 className="mb-2 text-sm font-semibold text-neutral-700">{category}</h2>
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-neutral-300 text-left">
                <th className="py-1.5">Nama Barang</th>
                <th className="py-1.5 text-right">Umum / Pasang</th>
                <th className="py-1.5 text-right">Sesama Bengkel</th>
              </tr>
            </thead>
            <tbody>
              {items?.map((row) => (
                <tr key={row.productId} className="border-b border-neutral-100">
                  <td className="py-1.5">{row.name}</td>
                  <td className="py-1.5 text-right">
                    {row.generalPrice != null ? formatCurrency(row.generalPrice) : '-'}
                  </td>
                  <td className="py-1.5 text-right">
                    {row.workshopPrice != null ? formatCurrency(row.workshopPrice) : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}