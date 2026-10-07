'use client';

import { useEffect, useRef, useState } from 'react';
import { ScanBarcode, Plus } from 'lucide-react';
import { Card } from '@/shared/components/Card';
import { useProducts } from '@/features/master-data/hooks/useProducts';

interface OpnameProductPickerProps {
  onSelect: (product: {
    id: string;
    name: string;
    totalStock: number;
  }) => void;
  excludeIds: string[];
}

export function OpnameProductPicker({
  onSelect,
  excludeIds,
}: OpnameProductPickerProps) {
  const [search, setSearch] = useState('');

  const inputRef = useRef<HTMLInputElement>(null);

  const { data: products, isLoading } = useProducts({
    search,
  });

  const results = (products ?? []).filter(
    (p) => !excludeIds.includes(p.id)
  );

  /**
   * Fokus otomatis ke input ketika halaman dibuka.
   * Berguna ketika menggunakan barcode scanner.
   */
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  function handleSelect(product: {
    id: string;
    name: string;
    totalStock: number;
  }) {
    onSelect(product);

    setSearch('');

    // Fokus kembali ke input setelah barang ditambahkan.
    setTimeout(() => {
      inputRef.current?.focus();
    }, 0);
  }

  function handleKeyDown(
    event: React.KeyboardEvent<HTMLInputElement>
  ) {
    if (event.key !== 'Enter') return;

    event.preventDefault();

    /**
     * Barcode scanner biasanya mengirim Enter
     * setelah selesai membaca barcode.
     *
     * Jika hanya ada satu hasil,
     * langsung tambahkan barang.
     */
    if (results.length === 1) {
      handleSelect({
        id: results[0].id,
        name: results[0].name,
        totalStock: results[0].total_stock,
      });
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {/* Search / Barcode Input */}
      <div className="relative">
        <ScanBarcode
          size={18}
          className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-neutral-400"
        />

        <input
          ref={inputRef}
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Scan / ketik barcode, SKU, atau nama barang..."
          autoComplete="off"
          className="focus:border-accent-500 focus:ring-accent-100 w-full rounded-md border border-neutral-300 py-2.5 pr-4 pl-10 text-base focus:ring-2 focus:outline-none"
        />
      </div>

      {/* Loading */}
      {search.trim() && isLoading && (
        <p className="text-sm text-neutral-400">
          Mencari barang...
        </p>
      )}

      {/* Results */}
      {search.trim() &&
        !isLoading &&
        results.length > 0 && (
          <div className="max-h-48 space-y-1 overflow-y-auto">
            {results.map((p) => (
              <Card
                key={p.id}
                onClick={() =>
                  handleSelect({
                    id: p.id,
                    name: p.name,
                    totalStock: p.total_stock,
                  })
                }
                className="flex cursor-pointer items-center justify-between p-2.5 active:bg-neutral-50"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-neutral-900">
                    {p.name}
                  </p>

                  <p className="text-xs text-neutral-500">
                    SKU / Barcode: {p.sku}
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  <span className="text-xs text-neutral-400">
                    Stok: {p.total_stock}
                  </span>

                  <Plus
                    size={16}
                    className="text-accent-600"
                  />
                </div>
              </Card>
            ))}
          </div>
        )}

      {/* Not Found */}
      {search.trim() &&
        !isLoading &&
        results.length === 0 && (
          <p className="text-sm text-neutral-400">
            Barang tidak ditemukan.
          </p>
        )}

      {/* Helper */}
      {!search.trim() && (
        <p className="text-xs text-neutral-400">
          Scan barcode atau ketik SKU/nama barang.
          Scanner barcode dapat digunakan langsung tanpa
          perubahan sistem.
        </p>
      )}
    </div>
  );
}