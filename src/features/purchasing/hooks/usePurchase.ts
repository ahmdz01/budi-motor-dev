'use client';

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/shared/lib/supabase/client';
import type { PurchaseDetail } from '../types';

export function usePurchase(id: string) {
  return useQuery({
    queryKey: ['purchase', id],
    queryFn: async (): Promise<PurchaseDetail> => {
      const supabase = createClient();

      const { data: purchase, error: purchaseError } = await supabase
        .from('purchases')
        .select(
          'id, supplier_id, purchase_date, total_amount, payment_status, amount_paid, suppliers(name)'
        )
        .eq('id', id)
        .single();

      if (purchaseError) throw purchaseError;

      const { data: items, error: itemsError } = await supabase
        .from('purchase_items')
        .select('id, product_id, qty, unit_price, subtotal, products(name)')
        .eq('purchase_id', id);

      if (itemsError) throw itemsError;

      return {
        id: purchase.id,
        supplier_id: purchase.supplier_id,
        supplier_name: (purchase.suppliers as unknown as { name: string } | null)?.name ?? '-',
        purchase_date: purchase.purchase_date,
        total_amount: purchase.total_amount,
        payment_status: purchase.payment_status,
        amount_paid: purchase.amount_paid,
        items: (items ?? []).map((it) => ({
          id: it.id,
          product_id: it.product_id,
          product_name: (it.products as unknown as { name: string } | null)?.name ?? '-',
          qty: it.qty,
          unit_price: it.unit_price,
          subtotal: it.subtotal,
        })),
      };
    },
    enabled: !!id,
  });
}