'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { createClient } from '@/shared/lib/supabase/client';
import { callRpc } from '@/shared/lib/supabase/rpc';
import { generateClientUuid } from '@/shared/lib/offline/clientUuid';
import type { PurchaseCartItem } from '../types';

interface CreatePurchaseInput {
  supplierId: string;
  purchaseDate: string;
  items: PurchaseCartItem[];
  amountPaid: number;
  dueDate: string | null;
}

export function useCreatePurchase() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: async (input: CreatePurchaseInput) => {
      const supabase = createClient();

      const result = await callRpc<
  {
    p_client_uuid: string;
    p_supplier_id: string;
    p_purchase_date: string;
    p_items: {
      product_id: string;
      qty: number;
      unit_price: number;
    }[];
    p_amount_paid: number;
    p_due_date: string | null;
  },
  {
    purchase_id: string;
  }[]
>(
  supabase,
  'sp_record_purchase',
  {
    p_client_uuid: generateClientUuid(),
    p_supplier_id: input.supplierId,
    p_purchase_date: input.purchaseDate,
    p_items: input.items.map((item) => ({
      product_id: item.productId,
      qty: item.qty,
      unit_price: item.unitPrice,
    })),
    p_amount_paid: input.amountPaid,
    p_due_date: input.dueDate,
  }
);

      if (!result.success) throw new Error(result.error.message);

      return result.data[0].purchase_id;
    },
    onSuccess: (purchaseId) => {
      queryClient.invalidateQueries({ queryKey: ['purchases'] });
      router.push(`/purchases/${purchaseId}`);
    },
  });
}