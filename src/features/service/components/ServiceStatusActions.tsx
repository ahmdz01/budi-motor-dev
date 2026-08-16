'use client';

import { useState } from 'react';
import { Card } from '@/shared/components/Card';
import { Button } from '@/shared/components/Button';
import { Input } from '@/shared/components/Input';
import { formatCurrency } from '@/shared/utils/formatCurrency';
import { useCurrentUser } from '@/shared/contexts/UserContext';
import { useActiveMechanics } from '../hooks/useActiveMechanics';
import { useChangeServiceStatus } from '../hooks/useChangeServiceStatus';
import { useSendServiceEstimate } from '../hooks/useSendServiceEstimate';
import { useApproveServiceEstimate } from '../hooks/useApproveServiceEstimate';
import {
  useConfirmServicePayment,
  type ServicePaymentMethod,
} from '../hooks/useConfirmServicePayment';
import type { ServiceDetail } from '../types';

type Mode = 'idle' | 'assign' | 'cancel' | 'estimate' | 'approve' | 'payment';

interface ServiceStatusActionsProps {
  service: ServiceDetail;
  hasItems: boolean;
  itemsTotal: number;
}

const paymentMethods: { value: ServicePaymentMethod; label: string }[] = [
  { value: 'cash', label: 'Tunai' },
  { value: 'qris', label: 'QRIS' },
  { value: 'transfer', label: 'Transfer' },
];

export function ServiceStatusActions({ service, hasItems, itemsTotal }: ServiceStatusActionsProps) {
  const { roleCode, id: currentUserId } = useCurrentUser();
  const [mode, setMode] = useState<Mode>('idle');
  const [selectedMechanicId, setSelectedMechanicId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [estimateNotes, setEstimateNotes] = useState('');
  const [approveReason, setApproveReason] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<ServicePaymentMethod>('cash');
  const [amountReceived, setAmountReceived] = useState(itemsTotal);
  const [paymentResult, setPaymentResult] = useState<{ change: number } | null>(null);

  const { data: mechanics } = useActiveMechanics(mode === 'assign');
  const changeStatus = useChangeServiceStatus();
  const sendEstimate = useSendServiceEstimate();
  const approveEstimate = useApproveServiceEstimate();
  const confirmPayment = useConfirmServicePayment();

  const isStaff = ['owner', 'admin', 'kasir', 'super_admin'].includes(roleCode);

  const canAssign = service.status === 'waiting' && isStaff;
  const canComplete =
    service.status === 'in_progress' &&
    (['owner', 'admin', 'super_admin'].includes(roleCode) ||
      (roleCode === 'mekanik' && service.mechanic_id === currentUserId));
  const canCancel =
    ['waiting', 'in_progress'].includes(service.status) &&
    ['owner', 'admin', 'super_admin'].includes(roleCode);
  const canSendEstimate = service.status === 'in_progress' && isStaff && hasItems;
  const canApproveEstimate = service.status === 'pending_approval' && isStaff;
  const canConfirmPayment = service.status === 'completed' && isStaff && hasItems;

  if (
    !canAssign &&
    !canComplete &&
    !canCancel &&
    !canSendEstimate &&
    !canApproveEstimate &&
    !canConfirmPayment
  ) {
    return null;
  }

  function resetMode() {
    setMode('idle');
    setSelectedMechanicId(null);
    setCancelReason('');
    setEstimateNotes('');
    setApproveReason('');
    setPaymentMethod('cash');
    setAmountReceived(itemsTotal);
    setPaymentResult(null);
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

  if (mode === 'estimate') {
    return (
      <Card className="flex flex-col gap-3 p-4">
        <p className="text-sm font-medium text-neutral-700">Kirim Estimasi</p>

        <div className="flex items-center justify-between rounded-md border border-neutral-200 p-3">
          <span className="text-sm text-neutral-500">Total Saat Ini</span>
          <span className="text-lg font-semibold">{formatCurrency(itemsTotal)}</span>
        </div>

        <textarea
          rows={3}
          value={estimateNotes}
          onChange={(e) => setEstimateNotes(e.target.value)}
          placeholder="Catatan tambahan untuk pelanggan (opsional)"
          className="focus:border-accent-500 focus:ring-accent-100 rounded-md border border-neutral-300 px-4 py-2.5 text-base focus:ring-2 focus:outline-none"
        />

        {sendEstimate.error && (
          <p className="text-danger-600 text-sm">{sendEstimate.error.message}</p>
        )}

        <div className="flex gap-2">
          <Button
            type="button"
            isLoading={sendEstimate.isPending}
            onClick={() =>
              sendEstimate.mutate(
                { serviceId: service.id, notes: estimateNotes },
                { onSuccess: resetMode }
              )
            }
          >
            Kirim Estimasi
          </Button>
          <Button type="button" variant="secondary" onClick={resetMode}>
            Batal
          </Button>
        </div>
      </Card>
    );
  }

  if (mode === 'approve') {
    return (
      <Card className="flex flex-col gap-3 p-4">
        <p className="text-sm font-medium text-neutral-700">Keputusan Pelanggan</p>

        <textarea
          rows={2}
          value={approveReason}
          onChange={(e) => setApproveReason(e.target.value)}
          placeholder="Catatan (opsional)"
          className="focus:border-accent-500 focus:ring-accent-100 rounded-md border border-neutral-300 px-4 py-2.5 text-base focus:ring-2 focus:outline-none"
        />

        {approveEstimate.error && (
          <p className="text-danger-600 text-sm">{approveEstimate.error.message}</p>
        )}

        <div className="flex gap-2">
          <Button
            type="button"
            isLoading={approveEstimate.isPending}
            onClick={() =>
              approveEstimate.mutate(
                { serviceId: service.id, approved: true, reason: approveReason },
                { onSuccess: resetMode }
              )
            }
          >
            Pelanggan Setuju
          </Button>
          <Button
            type="button"
            variant="danger"
            isLoading={approveEstimate.isPending}
            onClick={() =>
              approveEstimate.mutate(
                { serviceId: service.id, approved: false, reason: approveReason },
                { onSuccess: resetMode }
              )
            }
          >
            Pelanggan Menolak
          </Button>
        </div>
        <Button type="button" variant="secondary" onClick={resetMode}>
          Tutup
        </Button>
      </Card>
    );
  }

  if (mode === 'payment') {
    const change = paymentMethod === 'cash' ? amountReceived - itemsTotal : 0;

    if (paymentResult) {
      return (
        <Card className="flex flex-col items-center gap-2 p-4 text-center">
          <p className="text-base font-semibold text-neutral-900">Pembayaran Berhasil</p>
          <p className="text-sm text-neutral-500">Total {formatCurrency(itemsTotal)}</p>
          {paymentMethod === 'cash' && (
            <p className="text-sm text-neutral-500">
              Kembalian: {formatCurrency(paymentResult.change)}
            </p>
          )}
          <Button className="mt-2" onClick={resetMode}>
            Selesai
          </Button>
        </Card>
      );
    }

    return (
      <Card className="flex flex-col gap-3 p-4">
        <p className="text-sm font-medium text-neutral-700">Konfirmasi Pembayaran</p>

        <div className="flex items-center justify-between rounded-md border border-neutral-200 p-3">
          <span className="text-sm text-neutral-500">Total Tagihan</span>
          <span className="text-lg font-semibold">{formatCurrency(itemsTotal)}</span>
        </div>

        <div className="flex gap-2">
          {paymentMethods.map((m) => (
            <button
              key={m.value}
              type="button"
              onClick={() => setPaymentMethod(m.value)}
              className={`flex-1 rounded-md border py-2 text-sm font-medium ${
                paymentMethod === m.value
                  ? 'border-accent-600 bg-accent-50 text-accent-700'
                  : 'border-neutral-300 text-neutral-600'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>

        {paymentMethod === 'cash' && (
          <div className="flex flex-col gap-2">
            <Input
              id="amountReceived"
              label="Uang Diterima"
              type="number"
              min={0}
              value={amountReceived}
              onChange={(e) => setAmountReceived(Number(e.target.value))}
            />
            <div className="flex items-center justify-between rounded-md border border-neutral-200 p-3">
              <span className="text-sm text-neutral-500">Kembalian</span>
              <span
                className={`text-lg font-semibold ${
                  change < 0 ? 'text-danger-600' : 'text-neutral-900'
                }`}
              >
                {formatCurrency(Math.max(change, 0))}
              </span>
            </div>
          </div>
        )}

        {confirmPayment.error && (
          <p className="text-danger-600 text-sm">{confirmPayment.error.message}</p>
        )}

        <div className="flex gap-2">
          <Button
            type="button"
            isLoading={confirmPayment.isPending}
            disabled={paymentMethod === 'cash' && amountReceived < itemsTotal}
            onClick={() =>
              confirmPayment.mutate(
                {
                  serviceId: service.id,
                  paymentMethod,
                  amountReceived: paymentMethod === 'cash' ? amountReceived : null,
                },
                {
                  onSuccess: (data) => setPaymentResult({ change: data.change_amount }),
                }
              )
            }
          >
            Konfirmasi Pembayaran
          </Button>
          <Button type="button" variant="secondary" onClick={resetMode}>
            Batal
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
      {canSendEstimate && (
        <Button type="button" variant="secondary" onClick={() => setMode('estimate')}>
          Kirim Estimasi ke Pelanggan
        </Button>
      )}
      {canApproveEstimate && (
        <Button type="button" onClick={() => setMode('approve')}>
          Catat Keputusan Pelanggan
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
      {canConfirmPayment && (
        <Button type="button" onClick={() => setMode('payment')}>
          Konfirmasi Pembayaran
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
