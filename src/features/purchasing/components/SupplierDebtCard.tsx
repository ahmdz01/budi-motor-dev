'use client';

import { useState } from 'react';
import { Card } from '@/shared/components/Card';
import { Badge } from '@/shared/components/Badge';
import { Button } from '@/shared/components/Button';
import { Input } from '@/shared/components/Input';
import { formatCurrency } from '@/shared/utils/formatCurrency';
import { cn } from '@/shared/utils/cn';
import { usePaySupplierDebt } from '../hooks/usePaySupplierDebt';
import type { SupplierDebt } from '../types';

function dueDateTone(dueDate: string | null): 'danger' | 'warning' | 'neutral' {
  if (!dueDate) return 'neutral';
  const days = Math.ceil(
    (new Date(dueDate).getTime() - new Date().setHours(0, 0, 0, 0)) / 86400000
  );
  if (days <= 0) return 'danger';
  if (days <= 3) return 'warning';
  return 'neutral';
}

export function SupplierDebtCard({
  debt,
  supplierId,
}: {
  debt: SupplierDebt;
  supplierId: string;
}) {
  const [isPaying, setIsPaying] = useState(false);
  const [amount, setAmount] = useState(String(debt.sisa_hutang));
  const [method, setMethod] = useState<'cash' | 'transfer'>('cash');
  const payDebt = usePaySupplierDebt();

  const tone = dueDateTone(debt.due_date);

  function handlePay() {
    const numAmount = Number(amount);
    if (!numAmount || numAmount <= 0 || numAmount > debt.sisa_hutang) return;

    payDebt.mutate(
      { debtId: debt.id, amount: numAmount, paymentMethod: method, supplierId },
      { onSuccess: () => setIsPaying(false) }
    );
  }

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-neutral-500">Sisa Hutang</p>
          <p className="text-lg font-semibold text-neutral-900">
            {formatCurrency(debt.sisa_hutang)}
          </p>
          <p className="text-xs text-neutral-400">
            dari total {formatCurrency(debt.total_tagihan)}
          </p>
        </div>
        {debt.due_date && (
          <Badge variant={tone}>
            Jatuh tempo{' '}
            {new Date(debt.due_date).toLocaleDateString('id-ID', {
              day: 'numeric',
              month: 'short',
            })}
          </Badge>
        )}
      </div>

      {!isPaying && (
        <Button variant="secondary" size="md" onClick={() => setIsPaying(true)}>
          Bayar
        </Button>
      )}

      {isPaying && (
        <div className="flex flex-col gap-3 border-t border-neutral-100 pt-3">
          <Input
            label="Nominal Dibayar"
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
          <div className="flex gap-2">
            {(['cash', 'transfer'] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMethod(m)}
                className={cn(
                  'flex-1 rounded-md border py-2 text-sm font-medium',
                  method === m
                    ? 'border-accent-600 bg-accent-50 text-accent-700'
                    : 'border-neutral-300 text-neutral-600'
                )}
              >
                {m === 'cash' ? 'Tunai' : 'Transfer'}
              </button>
            ))}
          </div>
          {payDebt.error && <p className="text-sm text-danger-600">{payDebt.error.message}</p>}
          <div className="flex gap-2">
            <Button onClick={handlePay} isLoading={payDebt.isPending} size="md">
              Konfirmasi Bayar
            </Button>
            <Button
              variant="secondary"
              size="md"
              onClick={() => setIsPaying(false)}
              disabled={payDebt.isPending}
            >
              Batal
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}