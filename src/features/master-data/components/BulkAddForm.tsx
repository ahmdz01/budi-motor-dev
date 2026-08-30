'use client';

import { useState } from 'react';
import { Button } from '@/shared/components/Button';
import { CategoryBrandCombobox } from './CategoryBrandCombobox';
import { useCategories, useCreateCategory } from '../hooks/useCategories';
import { useBulkCreateProducts } from '../hooks/useBulkCreateProducts';

interface ParsedLine {
  name: string;
  brandName: string;
  priceSell: number;
  priceCost: number;
  qty: number;
}

interface ParseError {
  line: string;
  reason: string;
}

function parseInput(text: string): { valid: ParsedLine[]; errors: ParseError[] } {
  const valid: ParsedLine[] = [];
  const errors: ParseError[] = [];

  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  for (const line of lines) {
    const parts = line.split(',').map((p) => p.trim());

    if (parts.length !== 5) {
      errors.push({
        line,
        reason: 'Harus ada 5 bagian dipisah koma: Nama, Merek, Harga Jual, Harga Beli, Qty',
      });
      continue;
    }

    const [name, brandName, sellText, costText, qtyText] = parts;
    const priceSell = Number(sellText.replace(/[^0-9]/g, ''));
    const priceCost = Number(costText.replace(/[^0-9]/g, ''));
    const qty = Number(qtyText.replace(/[^0-9]/g, ''));

    if (!name) {
      errors.push({ line, reason: 'Nama tidak boleh kosong' });
      continue;
    }
    if (!priceSell || priceSell <= 0) {
      errors.push({ line, reason: 'Harga Jual tidak valid' });
      continue;
    }
    if (!priceCost || priceCost <= 0) {
      errors.push({ line, reason: 'Harga Beli tidak valid (wajib diisi, tidak boleh 0)' });
      continue;
    }
    if (priceCost >= priceSell) {
      errors.push({ line, reason: 'Harga Beli tidak boleh sama/lebih besar dari Harga Jual' });
      continue;
    }
    if (qty < 0 || isNaN(qty)) {
      errors.push({ line, reason: 'Qty tidak valid (boleh 0 kalau belum ada stok)' });
      continue;
    }

    valid.push({ name, brandName, priceSell, priceCost, qty });
  }

  return { valid, errors };
}

export function BulkAddForm() {
  const { data: categories = [] } = useCategories();
  const createCategory = useCreateCategory();
  const bulkCreate = useBulkCreateProducts();

  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [text, setText] = useState('');
  const [result, setResult] = useState<string | null>(null);

  const { valid, errors } = parseInput(text);

  function handleSubmit() {
    if (!categoryId || valid.length === 0) return;
    setResult(null);

    bulkCreate.mutate(
      { categoryId, items: valid },
      {
        onSuccess: (count) => {
          setResult(`${count} barang berhasil ditambahkan beserta stoknya.`);
          setText('');
        },
      }
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <CategoryBrandCombobox
        label="Kategori"
        options={categories}
        value={categoryId}
        onChange={setCategoryId}
        onCreateNew={(name) => createCategory.mutateAsync(name)}
        isCreating={createCategory.isPending}
      />

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-neutral-700">
          Daftar Barang (1 baris = 1 barang)
        </label>
        <p className="text-xs text-neutral-500">
          Format: <span className="font-mono">Nama, Merek, Harga Jual, Harga Beli, Qty</span>
          <br />
          Merek boleh dikosongkan (tetap tulis koma-nya). Contoh:
          <br />
          <span className="font-mono">Oli Federal 20W-50 0.8L, Federal, 55000, 45000, 12</span>
          <br />
          <span className="font-mono">Oli Tanpa Merek 1L, , 40000, 32000, 5</span>
        </p>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={10}
          placeholder={
            'Oli Federal 20W-50 0.8L, Federal, 55000, 45000, 12\nOli Yamalube Sport 10W-40 1L, Yamalube, 62000, 50000, 8'
          }
          className="rounded-md border border-neutral-300 px-4 py-2.5 font-mono text-sm focus:border-accent-500 focus:outline-none focus:ring-2 focus:ring-accent-100"
        />
      </div>

      {text.trim().length > 0 && (
        <div className="rounded-md border border-neutral-200 p-3 text-sm">
          <p className="text-success-700">{valid.length} barang siap ditambahkan</p>
          {errors.length > 0 && (
            <div className="mt-2">
              <p className="text-danger-600 font-medium">{errors.length} baris bermasalah:</p>
              {errors.map((e, i) => (
                <p key={i} className="text-danger-600 text-xs">
                  &ldquo;{e.line}&rdquo; — {e.reason}
                </p>
              ))}
            </div>
          )}
        </div>
      )}

      {bulkCreate.error && <p className="text-danger-600 text-sm">{bulkCreate.error.message}</p>}
      {result && <p className="text-success-600 text-sm">{result}</p>}

      <Button
        onClick={handleSubmit}
        isLoading={bulkCreate.isPending}
        disabled={!categoryId || valid.length === 0}
      >
        Proses {valid.length > 0 ? `(${valid.length} barang)` : ''}
      </Button>
    </div>
  );
}