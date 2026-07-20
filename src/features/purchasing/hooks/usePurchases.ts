'use client';

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/shared/lib/supabase/client';
import type { PurchaseListItem } from '../types';

export function usePurchases() {
  return useQuery({
    queryKey: ['purchases'],
    queryFn: async (): Promise<PurchaseListItem[]> => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('purchases')
        .select('id, purchase_date, total_amount, payment_status, amount_paid, suppliers(name)')
        .order('purchase_date', { ascending: false });

      if (error) throw error;

      return (data ?? []).map((p) => ({
        id: p.id,
        purchase_date: p.purchase_date,
        total_amount: p.total_amount,
        payment_status: p.payment_status,
        amount_paid: p.amount_paid,
        supplier_name: (p.suppliers as unknown as { name: string } | null)?.name ?? '-',
      }));
    },
    staleTime: 30 * 1000,
  });
}