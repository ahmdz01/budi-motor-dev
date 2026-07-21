'use client';

import { useState } from 'react';
import { Card } from '@/shared/components/Card';
import { Button } from '@/shared/components/Button';
import { useCurrentUser } from '@/shared/contexts/UserContext';
import { useActiveMechanics } from '../hooks/useActiveMechanics';
import { useChangeServiceStatus } from '../hooks/useChangeServiceStatus';
import type { ServiceDetail } from '../types';

type Mode = 'idle' | 'assign' | 'cancel';

export function ServiceStatusActions({ service }: { service: ServiceDetail }) {
  const { roleCode, id: currentUserId } = useCurrentUser();
  const [mode, setMode] = useState<Mode>('idle');
  const [selectedMechanicId, setSelectedMechanicId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState('');

  const { data: mechanics } = useActiveMechanics(mode === 'assign');
  const changeStatus = useChangeServiceStatus();

  const canAssign =
    service.status === 'waiting' && ['owner', 'admin', 'kasir', 'super_admin'].includes(roleCode);
  const canComplete =
    service.status === 'in_progress' &&
    (['owner', 'admin', 'super_admin'].includes(roleCode) ||
      (roleCode === 'mekanik' && service.mechanic_id === currentUserId));
  const canCancel =
    ['waiting', 'in_progress'].includes(service.status) &&
    ['owner', 'admin', 'super_admin'].includes(roleCode);

  if (!canAssign && !canComplete && !canCancel) return null;

  function resetMode() {
    setMode('idle');
    setSelectedMechanicId(null);
    setCancelReason('');
  }

  if (mode === 'assign') {
    return (
      <Card className="flex flex-col gap-3 p-4">
        <p className="text-sm font-medium text-neutral-700">Pilih Mekanik</p>
        <div className="flex flex-col gap-1.5">
          {mechanics?.length === 0 && (
            <p className="text-sm text-neutral-400">Belum ada mekanik aktif terdaftar.</p>
          )}
          {mechanics?.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setSelectedMechanicId(m.id)}
              className={`rounded-md border p-2.5 text-left text-sm ${
                selectedMechanicId === m.id
                  ? 'border-accent-600 bg-accent-50 text-accent-700'
                  : 'border-neutral-300 text-neutral-600'
              }`}
            >
              {m.name}
            </button>
          ))}
        </div>

        {changeStatus.error && (
          <p className="text-danger-600 text-sm">{changeStatus.error.message}</p>
        )}

        <div className="flex gap-2">
          <Button
            type="button"
            isLoading={changeStatus.isPending}
            disabled={!selectedMechanicId}
            onClick={() =>
              changeStatus.mutate(
                { serviceId: service.id, newStatus: 'in_progress', mechanicId: selectedMechanicId },
                { onSuccess: resetMode }
              )
            }
          >
            Mulai Servis
          </Button>
          <Button type="button" variant="secondary" onClick={resetMode}>
            Batal
          </Button>
        </div>
      </Card>
    );
  }

  if (mode === 'cancel') {
    return (
      <Card className="flex flex-col gap-3 p-4">
        <p className="text-sm font-medium text-neutral-700">Alasan Pembatalan</p>
        <textarea
          rows={3}
          value={cancelReason}
          onChange={(e) => setCancelReason(e.target.value)}
          placeholder="Contoh: pelanggan batal, salah input, dsb."
          className="focus:border-accent-500 focus:ring-accent-100 rounded-md border border-neutral-300 px-4 py-2.5 text-base focus:ring-2 focus:outline-none"
        />

        {changeStatus.error && (
          <p className="text-danger-600 text-sm">{changeStatus.error.message}</p>
        )}

        <div className="flex gap-2">
          <Button
            type="button"
            variant="danger"
            isLoading={changeStatus.isPending}
            disabled={cancelReason.trim().length < 3}
            onClick={() =>
              changeStatus.mutate(
                { serviceId: service.id, newStatus: 'cancelled', reason: cancelReason },
                { onSuccess: resetMode }
              )
            }
          >
            Batalkan Servis
          </Button>
          <Button type="button" variant="secondary" onClick={resetMode}>
            Tutup
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {canAssign && (
        <Button type="button" onClick={() => setMode('assign')}>
          Mulai Servis
        </Button>
      )}
      {canComplete && (
        <Button
          type="button"
          isLoading={changeStatus.isPending}
          onClick={() => changeStatus.mutate({ serviceId: service.id, newStatus: 'completed' })}
        >
          Tandai Selesai
        </Button>
      )}
      {canCancel && (
        <Button type="button" variant="danger" onClick={() => setMode('cancel')}>
          Batalkan Servis
        </Button>
      )}
    </div>
  );
}
