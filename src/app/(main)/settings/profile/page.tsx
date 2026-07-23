'use client';

import { useEffect, useState } from 'react';
import { Input } from '@/shared/components/Input';
import { Button } from '@/shared/components/Button';
import {
  useStoreSettings,
  useUpdateStoreSettings,
} from '@/features/settings/hooks/useStoreSettings';

export default function StoreProfilePage() {
  const { data: settings, isLoading } = useStoreSettings();
  const updateSettings = useUpdateStoreSettings();

  const [storeName, setStoreName] = useState('');
  const [address, setAddress] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');

  useEffect(() => {
    if (settings) {
      setStoreName(settings.store_name);
      setAddress(settings.address ?? '');
      setPhoneNumber(settings.phone_number ?? '');
    }
  }, [settings]);

  if (isLoading) return <div className="p-4 text-sm text-neutral-400">Memuat...</div>;

  return (
    <div className="flex flex-col gap-4 p-4">
      <h1 className="text-xl font-semibold">Profil Toko</h1>

      <Input label="Nama Toko" value={storeName} onChange={(e) => setStoreName(e.target.value)} />
      <Input label="Alamat" value={address} onChange={(e) => setAddress(e.target.value)} />
      <Input
        label="Nomor Telepon"
        value={phoneNumber}
        onChange={(e) => setPhoneNumber(e.target.value)}
      />

      {updateSettings.isSuccess && <p className="text-success-600 text-sm">Perubahan tersimpan.</p>}
      {updateSettings.error && (
        <p className="text-danger-600 text-sm">{updateSettings.error.message}</p>
      )}

      <Button
        isLoading={updateSettings.isPending}
        onClick={() =>
          updateSettings.mutate({
            store_name: storeName,
            address: address || null,
            phone_number: phoneNumber || null,
          })
        }
      >
        Simpan
      </Button>
    </div>
  );
}
