'use client';

import { useState } from 'react';
import { Input } from '@/shared/components/Input';
import { cn } from '@/shared/utils/cn';
import { getDateRangeFromPreset } from '../lib/dateRangePresets';
import type { DateRange, DateRangePreset } from '../types';

const presets: { value: DateRangePreset; label: string }[] = [
  { value: 'today', label: 'Hari Ini' },
  { value: 'week', label: 'Minggu' },
  { value: 'month', label: 'Bulan' },
  { value: 'custom', label: 'Pilih Tanggal' },
];

interface DateRangeFilterProps {
  value: DateRange;
  preset: DateRangePreset;
  onChange: (range: DateRange, preset: DateRangePreset) => void;
}

export function DateRangeFilter({ value, preset, onChange }: DateRangeFilterProps) {
  const [customFrom, setCustomFrom] = useState(value.from);
  const [customTo, setCustomTo] = useState(value.to);

  function selectPreset(p: DateRangePreset) {
    if (p === 'custom') {
      onChange({ from: customFrom, to: customTo }, 'custom');
      return;
    }
    onChange(getDateRangeFromPreset(p), p);
  }

  function applyCustomRange() {
    if (customFrom > customTo) return; // validasi: awal tidak boleh > akhir
    onChange({ from: customFrom, to: customTo }, 'custom');
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2 overflow-x-auto">
        {presets.map((p) => (
          <button
            key={p.value}
            onClick={() => selectPreset(p.value)}
            className={cn(
              'shrink-0 rounded-full px-3 py-1.5 text-xs font-medium',
              preset === p.value ? 'bg-accent-600 text-white' : 'bg-neutral-100 text-neutral-600'
            )}
          >
            {p.label}
          </button>
        ))}
      </div>

      {preset === 'custom' && (
        <div className="flex items-end gap-2">
          <Input
            label="Dari"
            type="date"
            value={customFrom}
            max={customTo}
            onChange={(e) => setCustomFrom(e.target.value)}
          />
          <Input
            label="Sampai"
            type="date"
            value={customTo}
            min={customFrom}
            onChange={(e) => setCustomTo(e.target.value)}
          />
          <button
            onClick={applyCustomRange}
            className="bg-accent-600 h-[42px] rounded-md px-4 text-sm font-medium text-white"
          >
            Terapkan
          </button>
        </div>
      )}
    </div>
  );
}
