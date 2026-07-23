'use client';

import { useEffect, useState } from 'react';
import { Input } from '@/shared/components/Input';
import { Button } from '@/shared/components/Button';
import {
  useStoreSettings,
  useUpdateStoreSettings,
} from '@/features/settings/hooks/useStoreSettings';

export default function ThresholdSettingsPage() {
  const { data: settings, isLoading } = useStoreSettings();
  const updateSettings = useUpdateStoreSettings();

  const [opnamePercent, setOpnamePercent] = useState('');
  const [largeTransaction, setLargeTransaction] = useState('');

  useEffect(() => {
    if (settings) {
      setOpnamePercent(String(settings.stock_opname_threshold_percent));
      setLargeTransaction(String(settings.large_transaction_threshold));
    }
  }, [settings]);

  if (isLoading) return <div className="p-4 text-sm text-neutral-400">Memuat...</div>;

  return (
    <div className="flex flex-col gap-4 p-4">
      <h1 className="text-xl font-semibold">Ambang Batas</h1>

      <p className="text-sm text-neutral-500">
        Catatan: dua angka ini baru tersimpan sebagai pengaturan. Belum ada RPC yang membacanya
        untuk menegakkan aturan apa pun — itu keputusan terpisah yang belum dibuat, lihat percakapan
        Langkah 11.3.
      </p>

      <Input
        label="Ambang Selisih Stock Opname (%)"
        type="number"
        min={1}
        max={100}
        value={opnamePercent}
        onChange={(e) => setOpnamePercent(e.target.value)}
      />

      <Input
        label="Ambang Transaksi Besar (Rp)"
        type="number"
        min={0}
        value={largeTransaction}
        onChange={(e) => setLargeTransaction(e.target.value)}
      />

      {updateSettings.isSuccess && <p className="text-success-600 text-sm">Perubahan tersimpan.</p>}
      {updateSettings.error && (
        <p className="text-danger-600 text-sm">{updateSettings.error.message}</p>
      )}

      <Button
        isLoading={updateSettings.isPending}
        onClick={() =>
          updateSettings.mutate({
            stock_opname_threshold_percent: Number(opnamePercent),
            large_transaction_threshold: Number(largeTransaction),
          })
        }
      >
        Simpan
      </Button>
    </div>
  );
}
