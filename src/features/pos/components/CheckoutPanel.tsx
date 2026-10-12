
'use client';

import { useState } from 'react';
import { X, WifiOff, CheckCircle2 } from 'lucide-react';
import { Button } from '@/shared/components/Button';
import { Input } from '@/shared/components/Input';
import { formatCurrency } from '@/shared/utils/formatCurrency';
import { generateClientUuid } from '@/shared/lib/offline/clientUuid';
import { useCartStore } from '../stores/useCartStore';
import {
  useCreatePosTransaction,
  type PaymentMethod,
} from '../hooks/useCreatePosTransaction';

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

  const total = items.reduce(
    (sum, item) => sum + item.priceSnapshot * item.qty,
    0,
  );

  const [paymentMethod, setPaymentMethod] =
    useState<PaymentMethod>('cash');
  const [amountReceived, setAmountReceived] = useState(total);
  const [formError, setFormError] = useState<string | null>(null);
  const [offlineSubmitting, setOfflineSubmitting] = useState(false);

  // Satu UUID untuk seluruh sesi checkout ini.
  // UUID tidak berubah hanya karena kasir mencoba membayar lagi.
  const [clientUuid] = useState(() => generateClientUuid());

  const [result, setResult] = useState<{
    transactionId: string | null;
    change: number;
    isQueued: boolean;
  } | null>(null);

  const createTransaction = useCreatePosTransaction();

  const change =
    paymentMethod === 'cash' ? amountReceived - total : 0;

  function handleConfirm() {
    setFormError(null);

    if (paymentMethod === 'cash' && amountReceived < total) {
      setFormError('Uang diterima kurang dari total belanja.');
      return;
    }

    const isOffline =
      typeof navigator !== 'undefined' && !navigator.onLine;

    // Beri tahu kasir saat proses antrean offline dimulai.
    setOfflineSubmitting(isOffline);

    createTransaction.mutate(
      {
        customerId,
        customerTypeUsed,
        items,
        paymentMethod,
        amountReceived:
          paymentMethod === 'cash' ? amountReceived : null,
        clientUuid,
      },
      {
        onSuccess: (data) => {
          setOfflineSubmitting(false);

          // Hasil ini baru diterima setelah penyimpanan
          // online berhasil atau antrean lokal berhasil disimpan.
          setResult({
            transactionId: data.transaction_id,
            change: data.change_amount,
            isQueued: data.is_queued,
          });
        },
        onError: () => {
          setOfflineSubmitting(false);
        },
      },
    );
  }

  function handleFinish() {
    clearCart();
    onClose();
  }

  if (result) {
    return (
      <div className="fixed inset-0 z-40 flex flex-col bg-white p-4 pb-24">
        <div
          className="flex flex-1 flex-col items-center justify-center gap-3 text-center"
          role="status"
          aria-live="polite"
        >
          {result.isQueued ? (
            <>
              <WifiOff size={44} className="text-amber-600" />

              <p className="text-lg font-semibold text-neutral-900">
                Transaksi Disimpan Sementara
              </p>

              <p className="text-sm text-neutral-600">
                Total {formatCurrency(total)}
              </p>

              {paymentMethod === 'cash' && (
                <p className="text-sm text-neutral-600">
                  Kembalian: {formatCurrency(result.change)}
                </p>
              )}

              <div className="mt-2 w-full rounded-lg border border-amber-300 bg-amber-50 p-4 text-left text-sm text-amber-900">
                <p className="font-semibold">
                  Belum tersimpan di server
                </p>
                <p className="mt-1">
                  Transaksi berhasil disimpan di perangkat ini
                  dan sedang menunggu sinkronisasi. Transaksi akan
                  dikirim ke server saat koneksi internet kembali.
                </p>
                <p className="mt-2 font-medium">
                  Status: Menunggu sinkronisasi
                </p>
              </div>
            </>
          ) : (
            <>
              <CheckCircle2 size={44} className="text-green-600" />

              <p className="text-lg font-semibold text-neutral-900">
                Transaksi Berhasil
              </p>

              <p className="text-sm text-neutral-600">
                Total {formatCurrency(total)}
              </p>

              {paymentMethod === 'cash' && (
                <p className="text-sm text-neutral-600">
                  Kembalian: {formatCurrency(result.change)}
                </p>
              )}
            </>
          )}
        </div>

        <Button onClick={handleFinish}>
          Transaksi Baru
        </Button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-white p-4 pb-24">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Pembayaran</h2>

        <button
          type="button"
          onClick={onClose}
          disabled={createTransaction.isPending}
          aria-label="Tutup pembayaran"
        >
          <X size={20} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="mb-4 flex items-center justify-between rounded-md border border-neutral-200 p-3">
          <span className="text-sm text-neutral-500">
            Total Belanja
          </span>
          <span className="text-lg font-semibold">
            {formatCurrency(total)}
          </span>
        </div>

        <p className="mb-2 text-sm font-medium text-neutral-700">
          Metode Pembayaran
        </p>

        <div className="mb-4 flex gap-2">
          {methods.map((method) => (
            <button
              key={method.value}
              type="button"
              disabled={createTransaction.isPending}
              onClick={() => setPaymentMethod(method.value)}
              className={`flex-1 rounded-md border py-2 text-sm font-medium ${
                paymentMethod === method.value
                  ? 'border-accent-600 bg-accent-50 text-accent-700'
                  : 'border-neutral-300 text-neutral-600'
              }`}
            >
              {method.label}
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
              onChange={(e) =>
                setAmountReceived(Number(e.target.value))
              }
            />

            <div className="flex items-center justify-between rounded-md border border-neutral-200 p-3">
              <span className="text-sm text-neutral-500">
                Kembalian
              </span>
              <span
                className={`text-lg font-semibold ${
                  change < 0
                    ? 'text-danger-600'
                    : 'text-neutral-900'
                }`}
              >
                {formatCurrency(Math.max(change, 0))}
              </span>
            </div>
          </div>
        )}

        {offlineSubmitting && (
          <div
            className="mt-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900"
            role="status"
            aria-live="polite"
          >
            <div className="flex items-center gap-2 font-semibold">
              <WifiOff size={18} />
              Koneksi internet terputus
            </div>
            <p className="mt-1">
              Sedang menyimpan transaksi ke antrean lokal
              perangkat. Transaksi belum dikirim ke server.
            </p>
          </div>
        )}

        {formError && (
          <p className="mt-2 text-sm text-danger-600">
            {formError}
          </p>
        )}

        {createTransaction.error && (
          <p className="mt-2 text-sm text-danger-600">
            {createTransaction.error.message}
          </p>
        )}
      </div>

      <Button
        onClick={handleConfirm}
        isLoading={createTransaction.isPending}
        className="mt-4"
      >
        Konfirmasi Pembayaran
      </Button>
    </div>
  );
}