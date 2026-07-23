import type { DateRange, DateRangePreset } from '../types';

function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * Menghitung rentang tanggal dari preset — dipanggil ulang setiap
 * kali preset dipilih, BUKAN disimpan statis, supaya "Hari Ini"
 * selalu akurat kalau pengguna membiarkan halaman terbuka lama.
 */
export function getDateRangeFromPreset(preset: Exclude<DateRangePreset, 'custom'>): DateRange {
  const now = new Date();
  const today = toIsoDate(now);

  if (preset === 'today') {
    return { from: today, to: today };
  }

  if (preset === 'week') {
    const start = new Date(now);
    start.setDate(now.getDate() - 6); // 7 hari termasuk hari ini
    return { from: toIsoDate(start), to: today };
  }

  // month
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  return { from: toIsoDate(start), to: today };
}
