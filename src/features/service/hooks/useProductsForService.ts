'use client';

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/shared/lib/supabase/client';

export interface ServiceSaleProduct {
  id: string;
  name: string;
  totalStock: number;
  price: number;
}

// Sengaja duplikat dari src/features/pos/hooks/useProductsForSale.ts,
// bukan diimpor lintas-fitur — POS dan Service sengaja didesain tidak
// saling bergantung (lihat catatan di useQuickCreateCustomer.ts).
export function useProductsForService(
  search: string,
  customerType: 'general' | 'service' | 'workshop'
) {
  return useQuery({
    queryKey: ['products-for-service', search, customerType],
    queryFn: async (): Promise<ServiceSaleProduct[]> => {
      const supabase = createClient();

      let productQuery = supabase
        .from('product_list_view')
        .select('id, name, total_stock')
        .eq('status', 'active')
        .gt('total_stock', 0)
        .order('name');

      if (search.trim()) {
        productQuery = productQuery.or(
          `name.ilike.%${search}%,barcode.ilike.%${search}%,sku.ilike.%${search}%`
        );
      }

      const { data: products, error: productError } = await productQuery;
      if (productError) throw productError;
      if (!products || products.length === 0) return [];

      const ids = products.map((p) => p.id);

      const { data: prices, error: priceError } = await supabase
        .from('product_prices')
        .select('product_id, price_value')
        .eq('price_type', customerType)
        .in('product_id', ids);

      if (priceError) throw priceError;

      const priceMap = new Map((prices ?? []).map((p) => [p.product_id, p.price_value]));

      return products
        .filter((p) => priceMap.has(p.id))
        .map((p) => ({
          id: p.id,
          name: p.name,
          totalStock: p.total_stock,
          price: priceMap.get(p.id)!,
        }));
    },
    enabled: search.trim().length > 0,
    staleTime: 10 * 1000,
  });
}
