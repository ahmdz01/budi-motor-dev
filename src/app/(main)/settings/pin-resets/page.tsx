'use client';

import { PinResetRequestItem } from '@/features/settings/components/PinResetRequestItem';
import { usePendingPinResets } from '@/features/settings/hooks/usePendingPinResets';

export default function PinResetsPage() {
  const { data: requests, isLoading, error } = usePendingPinResets();

  return (
    <div className="flex flex-col gap-4 p-4">
      <h1 className="text-xl font-semibold">Permintaan Reset PIN</h1>

      {isLoading && <p className="text-sm text-neutral-400">Memuat...</p>}
      {error && <p className="text-danger-600 text-sm">Gagal memuat data.</p>}

      {requests && requests.length === 0 && (
        <p className="text-center text-sm text-neutral-400">
          Tidak ada permintaan reset PIN yang menunggu.
        </p>
      )}

      {requests && requests.length > 0 && (
        <div className="space-y-2">
          {requests.map((r) => (
            <PinResetRequestItem key={r.id} request={r} />
          ))}
        </div>
      )}
    </div>
  );
}
