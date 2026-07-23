'use client';

import { useState } from 'react';
import { getDateRangeFromPreset } from '../lib/dateRangePresets';
import type { DateRange, DateRangePreset } from '../types';

export function useDateRangeState() {
  const [preset, setPreset] = useState<DateRangePreset>('today');
  const [range, setRange] = useState<DateRange>(() => getDateRangeFromPreset('today'));

  function handleChange(newRange: DateRange, newPreset: DateRangePreset) {
    setRange(newRange);
    setPreset(newPreset);
  }

  return { range, preset, onChange: handleChange };
}
