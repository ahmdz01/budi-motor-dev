
'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  Copy,
  RefreshCw,
  Trash2,
  X,
} from 'lucide-react';

import { Button } from '@/shared/components/Button';
import { formatCurrency } from '@/shared/utils/formatCurrency';
import {
  discardFailedOfflineAction,
  getPendingActions,
} from '@/shared/lib/offline/queue';

import type { PendingAction } from '@/shared/lib/offline/db';
import { usePendingSyncCount, useSyncOfflineTransactions } from '../hooks/useOfflineSync';

interface DisplayItem {
  productId: string;
  name: string;
  qty: number;
  unitPrice?: number;
}

interface LocalDisplayItem {
  productId?: string;
  name?: string;
  qty?: number;
  unitPrice?: number;
}

interface LocalDisplay {
  items?: LocalDisplayItem[];
  totalAmount?: number;
}

interface QueuedPosPayload {
  p_items?: unknown;
  p_payment_method?: unknown;
  p_amount_received?: unknown;
  _localDisplay?: unknown;
}

function getDisplayDetails(action: PendingAction) {
  const payload = action.payload as QueuedPosPayload;
  const local = payload._localDisplay as LocalDisplay | undefined;

  const fallbackItems: DisplayItem[] = Array.isArray(payload.p_items)
    ? (payload.p_items as { product_id?: string; qty?: number }[]).map(
        (item) => ({
          productId: item.product_id ?? 'ID tidak tersedia',
          name: item.product_id ?? 'Barang tanpa nama',
          qty: item.qty ?? 0,
        }),
      )
    : [];

  const items: DisplayItem[] =
    local?.items?.length
      ? local.items.map((item) => ({
          productId: item.productId ?? '',
          name: item.name ?? item.productId ?? 'Barang tanpa nama',
          qty: item.qty ?? 0,
          unitPrice: item.unitPrice,
        }))
      : fallbackItems;

  const methodLabels: Record<string, string> = {
    cash: 'Tunai',
    qris: 'QRIS',
    transfer: 'Transfer',
  };

  const paymentMethod =
    typeof payload.p_payment_method === 'string'
      ? payload.p_payment_method
      : '';

  return {
    items,
    totalAmount:
      typeof local?.totalAmount === 'number'
        ? local.totalAmount
        : null,
    paymentMethod: methodLabels[paymentMethod] ?? (paymentMethod || 'Tidak diketahui'),
    amountReceived:
      typeof payload.p_amount_received === 'number'
        ? payload.p_amount_received
        : null,
  };
}

function getStatusLabel(status: PendingAction['status']) {
  switch (status) {
    case 'pending':
      return 'Menunggu';
    case 'syncing':
      return 'Sedang disinkronkan';
    case 'failed':
      return 'Gagal';
  }
}

export function PendingSyncBadge() {
  const [open, setOpen] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const queryClient = useQueryClient();
  const { data: count = 0 } = usePendingSyncCount();
  const { mutate: sync, isPending, variables } =
    useSyncOfflineTransactions();

  const {
    data: actions = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['offline-pending-actions'],
    queryFn: async () => {
      const result = await getPendingActions();

      return result.filter(
        (action) =>
          action.entityType === 'pos_transaction' &&
          (
            action.status === 'pending' ||
            action.status === 'syncing' ||
            action.status === 'failed'
          ),
      );
    },
    enabled: open,
    refetchInterval: open ? 5_000 : false,
  });

  async function handleCopy(action: PendingAction) {
    const detail = getDisplayDetails(action);

    const text = JSON.stringify(
      {
        clientUuid: action.clientUuid,
        createdAt: action.createdAt,
        status: action.status,
        paymentMethod: detail.paymentMethod,
        totalAmount: detail.totalAmount,
        amountReceived: detail.amountReceived,
        items: detail.items,
        lastError: action.lastError ?? null,
      },
      null,
      2,
    );

    try {
      await navigator.clipboard.writeText(text);
      setFeedback('Detail transaksi berhasil disalin.');
    } catch {
      setFeedback(
        'Gagal menyalin. Pastikan situs dibuka melalui localhost atau HTTPS.',
      );
    }
  }

  async function handleDiscard(action: PendingAction) {
    const confirmed = window.confirm(
      'PERINGATAN: Uang dari transaksi ini mungkin sudah diterima. ' +
        'Membuang antrean hanya menghapus data lokal dan tidak membatalkan ' +
        'pembayaran atau mengembalikan uang. Pastikan transaksi sudah dicatat ' +
        'secara manual atau disetujui penanggung jawab sebelum melanjutkan. ' +
        'Yakin ingin membuang transaksi gagal ini?',
    );

    if (!confirmed) return;

    try {
      const removed = await discardFailedOfflineAction(action.clientUuid);

      if (!removed) {
        setFeedback(
          'Status transaksi sudah berubah. Muat ulang daftar sebelum melanjutkan.',
        );
      } else {
        setFeedback('Antrean lokal dihapus. Pastikan pencatatan manual tetap dilakukan.');
      }

      await Promise.all([
        refetch(),
        queryClient.invalidateQueries({
          queryKey: ['offline-pending-count'],
        }),
      ]);
    } catch {
      setFeedback('Gagal menghapus antrean lokal. Coba lagi.');
    }
  }

  function handleRetry(clientUuid: string) {
    setFeedback(null);

    sync(clientUuid, {
      onSuccess: (result) => {
        if (result.skipped) {
          setFeedback(
            'Sinkronisasi lain sedang berlangsung. Tunggu sebentar lalu coba lagi.',
          );
        } else if (result.failed > 0) {
          setFeedback(
            `Percobaan selesai. ${result.synced} berhasil, ${result.failed} gagal. Periksa alasan pada transaksi yang gagal.`,
          );
        } else {
          setFeedback('Percobaan sinkronisasi selesai.');
        }
      },
      onError: () => {
        setFeedback('Sinkronisasi gagal dimulai. Periksa koneksi lalu coba lagi.');
      },
    });
  }

  if (count === 0 && !open) return null;

  return (
    <>
      {count > 0 && (
        <button
          type="button"
          onClick={() => {
            setOpen(true);
            setFeedback(null);
          }}
          className="bg-accent-50 text-accent-700 flex w-full items-center justify-between gap-2 px-4 py-2 text-left text-sm font-medium"
          aria-label={`Lihat ${count} transaksi dalam antrean`}
        >
          <span>{count} transaksi dalam antrean atau sinkronisasi</span>
          <span className="flex items-center gap-2">
            <span className="text-xs">Lihat detail</span>
            <AlertTriangle size={17} />
          </span>
        </button>
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:p-4">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="pending-sync-title"
            className="flex max-h-[90dvh] w-full max-w-2xl flex-col rounded-t-xl bg-white shadow-xl sm:rounded-xl"
          >
            <header className="flex items-center justify-between gap-3 border-b border-neutral-200 p-4">
              <div>
                <h2
                  id="pending-sync-title"
                  className="text-lg font-semibold text-neutral-900"
                >
                  Antrean Transaksi Offline
                </h2>
                <p className="text-sm text-neutral-500">
                  Periksa dan selesaikan transaksi yang belum tersinkron.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-md p-2 text-neutral-600 hover:bg-neutral-100"
                aria-label="Tutup antrean transaksi"
              >
                <X size={20} />
              </button>
            </header>

            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-100 p-3">
              <span className="text-sm text-neutral-600">
                {count} transaksi dalam antrean
              </span>

              <Button
                variant="ghost"
                size="md"
                onClick={() => sync()}
                isLoading={isPending && variables === undefined}
                disabled={isPending}
              >
                <RefreshCw size={16} />
                Sinkronkan yang bisa dicoba
              </Button>
            </div>

            {feedback && (
              <p
                role="status"
                aria-live="polite"
                className="mx-4 mt-3 rounded-md bg-neutral-100 p-3 text-sm text-neutral-700"
              >
                {feedback}
              </p>
            )}

            <div className="flex-1 space-y-3 overflow-y-auto p-4">
              {isLoading && (
                <p className="text-sm text-neutral-500">
                  Memuat antrean transaksi...
                </p>
              )}

              {!isLoading && actions.length === 0 && (
                <p className="rounded-md border border-neutral-200 p-4 text-sm text-neutral-500">
                  Tidak ada transaksi dalam antrean.
                </p>
              )}

              {actions.map((action) => {
                const detail = getDisplayDetails(action);

                return (
                  <article
                    key={action.clientUuid}
                    className="rounded-lg border border-neutral-200 p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-neutral-900">
                          {getStatusLabel(action.status)}
                        </p>
                        <p className="mt-1 text-xs text-neutral-500">
                          {new Date(action.createdAt).toLocaleString('id-ID')}
                        </p>
                      </div>

                      <span className="rounded bg-neutral-100 px-2 py-1 text-xs text-neutral-700">
                        {detail.paymentMethod}
                      </span>
                    </div>

                    <div className="mt-3 space-y-2">
                      {detail.items.map((item, index) => (
                        <div
                          key={`${action.clientUuid}-${item.productId}-${index}`}
                          className="flex justify-between gap-3 text-sm"
                        >
                          <span className="min-w-0 wrap-break-word text-neutral-700">
                            {item.name} × {item.qty}
                          </span>

                          {typeof item.unitPrice === 'number' && (
                            <span className="shrink-0 text-neutral-500">
                              {formatCurrency(item.unitPrice * item.qty)}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>

                    <div className="mt-3 border-t border-neutral-100 pt-3 text-sm">
                      <div className="flex justify-between gap-2">
                        <span className="text-neutral-500">
                          Estimasi total saat transaksi
                        </span>
                        <span className="font-semibold text-neutral-900">
                          {detail.totalAmount !== null
                            ? formatCurrency(detail.totalAmount)
                            : 'Tidak tersedia pada antrean lama'}
                        </span>
                      </div>

                      {detail.amountReceived !== null && (
                        <div className="mt-1 flex justify-between gap-2">
                          <span className="text-neutral-500">
                            Uang diterima
                          </span>
                          <span>{formatCurrency(detail.amountReceived)}</span>
                        </div>
                      )}
                    </div>

                    {action.lastError && (
                      <div className="mt-3 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                        <p className="font-semibold">Penyebab gagal</p>
                        <p className="mt-1 wrap-break-word">{action.lastError}</p>
                        {action.lastErrorRetryable === true && (
                          <p className="mt-1 text-xs">
                            Kegagalan sementara; sistem dapat mencoba lagi.
                          </p>
                        )}
                        {action.lastErrorRetryable === false && (
                          <p className="mt-1 text-xs">
                            Perlu diperiksa dan dicoba ulang secara manual.
                          </p>
                        )}
                      </div>
                    )}

                    <p className="mt-3 break-all text-xs text-neutral-400">
                      ID: {action.clientUuid}
                    </p>

                    <div className="mt-4 flex flex-wrap gap-2">
                      {action.status === 'failed' && (
                        <Button
                          size="md"
                          onClick={() => handleRetry(action.clientUuid)}
                          isLoading={
                            isPending && variables === action.clientUuid
                          }
                          disabled={isPending}
                        >
                          <RefreshCw size={15} />
                          Coba lagi
                        </Button>
                      )}

                      <Button
                        variant="ghost"
                        size="md"
                        onClick={() => void handleCopy(action)}
                      >
                        <Copy size={15} />
                        Salin detail
                      </Button>

                      {action.status === 'failed' && (
                        <Button
                          variant="ghost"
                          size="md"
                          onClick={() => void handleDiscard(action)}
                          disabled={isPending}
                        >
                          <Trash2 size={15} />
                          Buang antrean
                        </Button>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>

            <footer className="border-t border-neutral-200 p-3">
              <Button
                variant="ghost"
                className="w-full"
                onClick={() => setOpen(false)}
              >
                Tutup
              </Button>
            </footer>
          </section>
        </div>
      )}
    </>
  );
}