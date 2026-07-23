'use client';

import { Download, Printer } from 'lucide-react';
import { Button } from '@/shared/components/Button';

interface ReportActionsProps {
  onExport: () => void;
  isExportDisabled?: boolean;
}

/**
 * Tombol Cetak memakai window.print() bawaan browser (bukan library
 * PDF tambahan) — "Simpan sebagai PDF" sudah tersedia di dialog print
 * browser modern, cukup untuk kebutuhan laporan sederhana ini (YAGNI).
 * CSS print-only (lihat globals.css) menyembunyikan navigasi/tombol
 * saat dicetak, supaya hasilnya rapi.
 */
export function ReportActions({ onExport, isExportDisabled }: ReportActionsProps) {
  return (
    <div className="flex gap-2 print:hidden">
      <Button variant="secondary" size="md" onClick={onExport} disabled={isExportDisabled}>
        <Download size={16} /> Excel
      </Button>
      <Button variant="secondary" size="md" onClick={() => window.print()}>
        <Printer size={16} /> Cetak / PDF
      </Button>
    </div>
  );
}
