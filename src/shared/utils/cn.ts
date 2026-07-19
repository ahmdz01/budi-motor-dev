import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Menggabungkan className secara aman.
 *
 * Kenapa perlu ini (bukan cuma template string biasa):
 * Kalau komponen Button punya default "px-4 py-2" tapi salah satu
 * pemanggil ingin override jadi "px-6", string biasa akan menghasilkan
 * "px-4 py-2 px-6" — Tailwind bingung class mana yang menang.
 * twMerge secara cerdas menghapus konflik (hasil akhir: "py-2 px-6").
 * clsx menangani className kondisional, contoh:
 *   cn('base-class', isActive && 'text-accent-600')
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
