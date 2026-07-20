'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';

import { createClient } from '@/shared/lib/supabase/client';
import { callRpc } from '@/shared/lib/supabase/rpc';

import type { OpnameCartItem } from '../types';

export function useCreateStockOpname() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: async (items: OpnameCartItem[]) => {
      const supabase = createClient();

      const result = await callRpc<
        {
          p_scope_type: string;
          p_scope_value: string | null;
          p_items: {
            product_id: string;
            stok_fisik: number;
            reason: string | null;
            harga_beli_baru: number | null;
          }[];
        },
        {
          session_id: string;
        }[]
      >(supabase, 'sp_stock_opname_adjust', {
        p_scope_type: 'manual',
        p_scope_value: null,
        p_items: items.map((item) => ({
          product_id: item.productId,
          stok_fisik: item.stokFisik,
          reason: item.reason ?? null,
          harga_beli_baru: item.hargaBeliBaru,
        })),
      });

      if (!result.success) {
        throw new Error(result.error.message);
      }

      return result.data[0].session_id;
    },

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['products'],
      });

      queryClient.invalidateQueries({
        queryKey: ['opname-sessions'],
      });

      router.push('/inventory');
    },
  });
}
