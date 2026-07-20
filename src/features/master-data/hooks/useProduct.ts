'use client';

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/shared/lib/supabase/client';
import type { ProductDetail } from '../types';

export function useProduct(id: string) {
  return useQuery({
    queryKey: ['product', id],
    queryFn: async (): Promise<ProductDetail> => {
      const supabase = createClient();

      const { data: product, error: productError } = await supabase
        .from('product_list_view')
        .select('*')
        .eq('id', id)
        .single();

      if (productError) throw productError;

      const { data: prices, error: pricesError } = await supabase
        .from('product_prices')
        .select('price_type, price_value')
        .eq('product_id', id);

      if (pricesError) throw pricesError;

      return { ...product, prices: prices ?? [] } as ProductDetail;
    },
    enabled: !!id,
  });
}
