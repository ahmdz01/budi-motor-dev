'use client';

import { useState } from 'react';
import { Card } from '@/shared/components/Card';
import { Input } from '@/shared/components/Input';
import { Button } from '@/shared/components/Button';
import {
  useRecordManualLedgerEntry,
  type ManualEntryType,
} from '../hooks/useRecordManualLedgerEntry';

interface ManualLedgerEntryFormProps {
  entryType: ManualEntryType;
  title: string;
  fromCashLabel?: string;
  onClose: () => void;
}

export function ManualLedgerEntryForm({
  entryType,
  title,
  fromCashLabel,
  onClose,
}: ManualLedgerEntryFormProps) {
  const [amount, setAmount] = useState(0);
  const [description, setDescription] = useState('');
  const [fromCash, setFromCash] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const recordEntry = useRecordManualLedgerEntry();

  function handleSubmit() {
    setFormError(null);

    if (amount <= 0) return setFormError('Jumlah harus lebih dari 0.');
    if (description.trim().length < 3) return setFormError('Keterangan minimal 3 karakter.');

    recordEntry.mutate(
      { entryType, amount, description, fromCash },
      { onSuccess: () => setDone(true) }
    );
  }

  if (done) {
    return (
      <Card className="flex flex-col items-center gap-3 p-4 text-center">
        <p className="text-base font-semibold text-neutral-900">Berhasil Dicatat</p>
        <Button onClick={onClose}>Selesai</Button>
      </Card>
    );
  }

  return (
    <Card className="flex flex-col gap-3 p-4">
      <p className="text-sm font-medium text-neutral-700">{title}</p>

      <Input
        label="Jumlah"
        type="number"
        min={0}
        value={amount}
        onChange={(e) => setAmount(Number(e.target.value))}
      />

      <Input
        label="Keterangan"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Contoh: setoran modal awal, bayar listrik bulan Juli, dsb."
      />

      {fromCashLabel && (
        <label className="flex items-center gap-2 text-sm text-neutral-700">
          <input
            type="checkbox"
            checked={fromCash}
            onChange={(e) => setFromCash(e.target.checked)}
          />
          {fromCashLabel}
        </label>
      )}

      {formError && <p className="text-danger-600 text-sm">{formError}</p>}
      {recordEntry.error && <p className="text-danger-600 text-sm">{recordEntry.error.message}</p>}

      <div className="flex gap-2">
        <Button isLoading={recordEntry.isPending} onClick={handleSubmit}>
          Simpan
        </Button>
        <Button variant="secondary" onClick={onClose}>
          Batal
        </Button>
      </div>
    </Card>
  );
}
