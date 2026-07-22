'use client';

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/shared/lib/supabase/client';
import type { TransactionDetail } from '../types';

export function useTransaction(id: string) {
  return useQuery({
    queryKey: ['transaction', id],
    queryFn: async (): Promise<TransactionDetail> => {
      const supabase = createClient();

      const { data: tx, error: txError } = await supabase
        .from('transactions')
        .select(
          'id, customer_type_used, source, service_id, total_amount, payment_method, amount_received, status, created_at, cashier_id, customers(name)'
        )
        .eq('id', id)
        .single();

      if (txError) throw txError;

      const [itemsResult, cashierResult] = await Promise.all([
        supabase
          .from('transaction_items')
          .select('id, item_type, name_snapshot, price_snapshot, qty, subtotal')
          .eq('transaction_id', id),
        supabase.from('users').select('name').eq('id', tx.cashier_id).single(),
      ]);

      if (itemsResult.error) throw itemsResult.error;
      if (cashierResult.error) throw cashierResult.error;

      return {
        id: tx.id,
        customer_name: (tx.customers as unknown as { name: string } | null)?.name ?? null,
        customer_type_used: tx.customer_type_used,
        source: tx.source,
        service_id: tx.service_id,
        total_amount: tx.total_amount,
        payment_method: tx.payment_method,
        amount_received: tx.amount_received,
        status: tx.status,
        created_at: tx.created_at,
        cashier_name: cashierResult.data?.name ?? '-',
        items: (itemsResult.data ?? []) as TransactionDetail['items'],
      };
    },
    enabled: Boolean(id),
  });
}
