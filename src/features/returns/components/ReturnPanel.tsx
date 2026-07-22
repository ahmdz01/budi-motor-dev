'use client';

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/shared/components/Button';
import { Input } from '@/shared/components/Input';
import { formatCurrency } from '@/shared/utils/formatCurrency';
import { useReturnedQty } from '../hooks/useReturnedQty';
import { useProcessReturn } from '../hooks/useProcessReturn';

interface ReturnPanelProps {
  itemName: string;
  originalQty: number;
  priceSnapshot: number;
  itemType?: 'product' | 'labor';
  transactionItemId?: string;
  serviceItemId?: string;
  onClose: () => void;
}

export function ReturnPanel({
  itemName,
  originalQty,
  priceSnapshot,
  itemType = 'product',
  transactionItemId,
  serviceItemId,
  onClose,
}: ReturnPanelProps) {
  const { data: returnedQty, isLoading: loadingReturned } = useReturnedQty(
    transactionItemId,
    serviceItemId
  );
  const processReturn = useProcessReturn();

  const remaining = originalQty - (returnedQty ?? 0);

  const [qty, setQty] = useState(1);
  const [reason, setReason] = useState('');
  const [refundAmount, setRefundAmount] = useState(priceSnapshot);
  const [restock, setRestock] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    setRefundAmount(priceSnapshot * qty);
  }, [qty, priceSnapshot]);

  function handleSubmit() {
    setFormError(null);

    if (qty <= 0 || qty > remaining)
      return setFormError(`Qty retur harus antara 1 dan ${remaining}.`);
    if (reason.trim().length < 3) return setFormError('Alasan retur minimal 3 karakter.');
    if (refundAmount < 0) return setFormError('Jumlah refund tidak boleh negatif.');

    processReturn.mutate(
      { transactionItemId, serviceItemId, qtyReturned: qty, reason, refundAmount, restock },
      { onSuccess: () => setDone(true) }
    );
  }

  if (done) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-3 bg-white p-4 text-center">
        <p className="text-lg font-semibold text-neutral-900">Retur Berhasil Diproses</p>
        <p className="text-sm text-neutral-500">Refund {formatCurrency(refundAmount)}</p>
        <Button onClick={onClose}>Selesai</Button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white p-4">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Proses Retur</h2>
        <button type="button" onClick={onClose} disabled={processReturn.isPending}>
          <X size={20} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <p className="mb-1 text-sm font-medium text-neutral-900">{itemName}</p>

        {loadingReturned ? (
          <p className="text-sm text-neutral-400">Memuat sisa yang bisa diretur...</p>
        ) : (
          <p className="mb-3 text-xs text-neutral-500">
            Sudah diretur: {returnedQty ?? 0} dari {originalQty} — sisa bisa diretur: {remaining}
          </p>
        )}

        {remaining <= 0 ? (
          <p className="text-danger-600 text-sm">Item ini sudah diretur seluruhnya.</p>
        ) : (
          <div className="flex flex-col gap-3">
            <Input
              label="Qty Diretur"
              type="number"
              min={1}
              max={remaining}
              value={qty}
              onChange={(e) => setQty(Number(e.target.value))}
            />

            <textarea
              rows={2}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Alasan retur (wajib, minimal 3 karakter)"
              className="focus:border-accent-500 focus:ring-accent-100 rounded-md border border-neutral-300 px-4 py-2.5 text-base focus:ring-2 focus:outline-none"
            />

            <Input
              label="Jumlah Refund"
              type="number"
              min={0}
              value={refundAmount}
              onChange={(e) => setRefundAmount(Number(e.target.value))}
            />

            {itemType === 'product' && (
              <label className="flex items-center gap-2 text-sm text-neutral-700">
                <input
                  type="checkbox"
                  checked={restock}
                  onChange={(e) => setRestock(e.target.checked)}
                />
                Barang masih baik, kembalikan ke stok
              </label>
            )}

            {itemType === 'product' && !restock && (
              <p className="text-xs text-neutral-500">
                Barang tidak akan ditambahkan kembali ke stok (dianggap rusak/dibuang).
              </p>
            )}

            {formError && <p className="text-danger-600 text-sm">{formError}</p>}
            {processReturn.error && (
              <p className="text-danger-600 text-sm">{processReturn.error.message}</p>
            )}
          </div>
        )}
      </div>

      {remaining > 0 && (
        <Button className="mt-4" isLoading={processReturn.isPending} onClick={handleSubmit}>
          Proses Retur
        </Button>
      )}
    </div>
  );
}
