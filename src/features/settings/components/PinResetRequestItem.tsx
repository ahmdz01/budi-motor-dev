'use client';

import { useState, useTransition } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Card } from '@/shared/components/Card';
import { Input } from '@/shared/components/Input';
import { Button } from '@/shared/components/Button';
import { resolvePinReset } from '../actions/resolvePinReset';
import type { PinResetRequest } from '../hooks/usePendingPinResets';

export function PinResetRequestItem({ request }: { request: PinResetRequest }) {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    setError(null);

    const newPin = formData.get('newPin') as string;
    const confirmPin = formData.get('confirmPin') as string;

    if (newPin !== confirmPin) {
      setError('Konfirmasi PIN tidak cocok.');
      return;
    }

    startTransition(async () => {
      const result = await resolvePinReset(formData);
      if (!result.success) {
        setError(result.error);
        return;
      }
      queryClient.invalidateQueries({ queryKey: ['pin-reset-requests'] });
    });
  }

  return (
    <Card className="flex flex-col gap-3 p-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-neutral-900">{request.phone_number}</p>
          <p className="text-xs text-neutral-500">
            Diminta {new Date(request.requested_at).toLocaleString('id-ID')}
          </p>
        </div>
        {!isOpen && (
          <Button variant="secondary" size="md" onClick={() => setIsOpen(true)}>
            Set PIN Baru
          </Button>
        )}
      </div>

      {isOpen && (
        <form action={handleSubmit} className="flex flex-col gap-2">
          <input type="hidden" name="requestId" value={request.id} />
          <input type="hidden" name="phoneNumber" value={request.phone_number} />

          <Input
            id={`newPin-${request.id}`}
            name="newPin"
            label="PIN Baru (4 digit)"
            type="password"
            inputMode="numeric"
            maxLength={4}
            required
          />
          <Input
            id={`confirmPin-${request.id}`}
            name="confirmPin"
            label="Konfirmasi PIN Baru"
            type="password"
            inputMode="numeric"
            maxLength={4}
            required
          />

          {error && <p className="text-danger-600 text-sm">{error}</p>}

          <div className="flex gap-2">
            <Button type="submit" size="md" isLoading={isPending}>
              Simpan & Selesaikan
            </Button>
            <Button type="button" variant="secondary" size="md" onClick={() => setIsOpen(false)}>
              Batal
            </Button>
          </div>
        </form>
      )}
    </Card>
  );
}
