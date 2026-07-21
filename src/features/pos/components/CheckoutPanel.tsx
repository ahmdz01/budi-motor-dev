'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/shared/components/Button';
import { Input } from '@/shared/components/Input';
import { formatCurrency } from '@/shared/utils/formatCurrency';
import { useCartStore } from '../stores/useCartStore';
import { useCreatePosTransaction, type PaymentMethod } from '../hooks/useCreatePosTransaction';

const methods: { value: PaymentMethod; label: string }[] = [
  { value: 'cash', label: 'Tunai' },
  { value: 'qris', label: 'QRIS' },
  { value: 'transfer', label: 'Transfer' },
];

interface CheckoutPanelProps {
  onClose: () => void;
}

export function CheckoutPanel({ onClose }: CheckoutPanelProps) {
  const items = useCartStore((s) => s.items);
  const customerId = useCartStore((s) => s.customerId);
  const customerTypeUsed = useCartStore((s) => s.customerTypeUsed);
  const clearCart = useCartStore((s) => s.clear);

  const total = items.reduce((sum, i) => sum + i.priceSnapshot * i.qty, 0);

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [amountReceived, setAmountReceived] = useState(total);
  const [formError, setFormError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    transactionId: string | null;
    change: number;
    isQueued: boolean;
  } | null>(null);

  const createTransaction = useCreatePosTransaction();

  const change = paymentMethod === 'cash' ? amountReceived - total : 0;

  function handleConfirm() {
    setFormError(null);

    if (paymentMethod === 'cash' && amountReceived < total) {
      return setFormError('Uang diterima kurang dari total belanja.');
    }

    createTransaction.mutate(
      {
        customerId,
        customerTypeUsed,
        items,
        paymentMethod,
        amountReceived: paymentMethod === 'cash' ? amountReceived : null,
      },
      {
        onSuccess: (data) => {
          setResult({
            transactionId: data.transaction_id,
            change: data.change_amount,
            isQueued: data.is_queued,
          });
        },
      }
    );
  }

  function handleFinish() {
    clearCart();
    onClose();
  }

  if (result) {
    return (
      <div className="fixed inset-0 z-40 flex flex-col bg-white p-4 pb-24">
        <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center">
          <p className="text-lg font-semibold text-neutral-900">
            {result.isQueued ? 'Transaksi Tersimpan' : 'Transaksi Berhasil'}
          </p>
          <p className="text-sm text-neutral-500">Total {formatCurrency(total)}</p>
          {paymentMethod === 'cash' && (
            <p className="text-sm text-neutral-500">Kembalian: {formatCurrency(result.change)}</p>
          )}
          {result.isQueued && (
            <p className="text-warning-700 bg-warning-50 mt-2 rounded-md px-3 py-2 text-xs">
              Sedang offline — transaksi akan otomatis disinkronkan saat koneksi kembali.
            </p>
          )}
        </div>
        <Button onClick={handleFinish}>Transaksi Baru</Button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-white p-4 pb-24">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Pembayaran</h2>
        <button type="button" onClick={onClose} disabled={createTransaction.isPending}>
          <X size={20} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="mb-4 flex items-center justify-between rounded-md border border-neutral-200 p-3">
          <span className="text-sm text-neutral-500">Total Belanja</span>
          <span className="text-lg font-semibold">{formatCurrency(total)}</span>
        </div>

        <p className="mb-2 text-sm font-medium text-neutral-700">Metode Pembayaran</p>
        <div className="mb-4 flex gap-2">
          {methods.map((m) => (
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

        {formError && <p className="text-danger-600 mt-2 text-sm">{formError}</p>}
        {createTransaction.error && (
          <p className="text-danger-600 mt-2 text-sm">{createTransaction.error.message}</p>
        )}
      </div>

      <Button onClick={handleConfirm} isLoading={createTransaction.isPending} className="mt-4">
        Konfirmasi Pembayaran
      </Button>
    </div>
  );
}
