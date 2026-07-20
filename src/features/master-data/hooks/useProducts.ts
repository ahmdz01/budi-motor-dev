'use client';

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/shared/lib/supabase/client';
import type { ProductListItem } from '../types';

export type StockFilter = 'all' | 'low' | 'out';

interface UseProductsParams {
  search?: string;
  stockFilter?: StockFilter;
}

export function useProducts({ search = '', stockFilter = 'all' }: UseProductsParams = {}) {
  return useQuery({
    queryKey: ['products', search, stockFilter],
    queryFn: async (): Promise<ProductListItem[]> => {
      const supabase = createClient();
      let query = supabase
        .from('product_list_view')
        .select('*')
        .eq('status', 'active')
        .order('name');

      // Multi-kriteria: nama ATAU barcode ATAU SKU (BR pencarian
      // yang disepakati sejak Screen Specification) — 1 kolom
      // input, sistem yang pintar mencari ke banyak field.
      if (search.trim()) {
        query = query.or(`name.ilike.%${search}%,barcode.ilike.%${search}%,sku.ilike.%${search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;

      let result = data as ProductListItem[];

      if (stockFilter === 'low') {
        result = result.filter((p) => p.total_stock > 0 && p.total_stock <= p.min_stock);
      } else if (stockFilter === 'out') {
        result = result.filter((p) => p.total_stock === 0);
      }

      return result;
    },
    staleTime: 30 * 1000,
  });
}
