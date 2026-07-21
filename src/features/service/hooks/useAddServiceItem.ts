'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { createClient } from '@/shared/lib/supabase/client';
import { callRpc } from '@/shared/lib/supabase/rpc';

interface AddServiceItemInput {
  serviceId: string;
  itemType: 'product' | 'labor';
  productId?: string | null;
  name?: string | null;
  price?: number | null;
  qty: number;
}

interface AddServiceItemParams {
  p_service_id: string;
  p_item_type: string;
  p_product_id: string | null;
  p_name: string | null;
  p_price: number | null;
  p_qty: number;
}

interface AddServiceItemResult {
  service_item_id: string;
  subtotal: number;
}

export function useAddServiceItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: AddServiceItemInput) => {
      const supabase = createClient();

      const result = await callRpc<AddServiceItemParams, AddServiceItemResult[]>(
        supabase,
        'sp_add_service_item',
        {
          p_service_id: input.serviceId,
          p_item_type: input.itemType,
          p_product_id: input.productId ?? null,
          p_name: input.name ?? null,
          p_price: input.price ?? null,
          p_qty: input.qty,
        }
      );

      if (!result.success) {
        throw new Error(result.error.message);
      }

      return result.data[0];
    },

    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['service-items', variables.serviceId],
      });
    },
  });
}
