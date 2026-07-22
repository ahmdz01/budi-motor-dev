'use client';

import { useState } from 'react';
import { Button } from '@/shared/components/Button';
import { ManualLedgerEntryForm } from '@/features/financial/components/ManualLedgerEntryForm';
import type { ManualEntryType } from '@/features/financial/hooks/useRecordManualLedgerEntry';

export default function FinancialPage() {
  const [activeMode, setActiveMode] = useState<ManualEntryType | null>(null);

  return (
    <div className="flex flex-col gap-4 p-4">
      <h1 className="text-xl font-semibold">Catatan Keuangan</h1>

      {!activeMode && (
        <div className="flex flex-col gap-2">
          <Button onClick={() => setActiveMode('restock_deposit')}>Setor Dana Restock</Button>
          <Button variant="secondary" onClick={() => setActiveMode('restock_withdrawal')}>
            Tarik Dana Restock
          </Button>
          <Button variant="secondary" onClick={() => setActiveMode('operational_expense')}>
            Catat Biaya Operasional
          </Button>
        </div>
      )}

      {activeMode === 'restock_deposit' && (
        <ManualLedgerEntryForm
          entryType="restock_deposit"
          title="Setor Dana Restock"
          fromCashLabel="Ambil dari Kas (transfer internal, kas berkurang)"
          onClose={() => setActiveMode(null)}
        />
      )}

      {activeMode === 'restock_withdrawal' && (
        <ManualLedgerEntryForm
          entryType="restock_withdrawal"
          title="Tarik Dana Restock"
          fromCashLabel="Masukkan ke Kas (transfer internal, kas bertambah)"
          onClose={() => setActiveMode(null)}
        />
      )}

      {activeMode === 'operational_expense' && (
        <ManualLedgerEntryForm
          entryType="operational_expense"
          title="Catat Biaya Operasional"
          onClose={() => setActiveMode(null)}
        />
      )}
    </div>
  );
}
