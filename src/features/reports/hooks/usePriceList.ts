'use client';

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/shared/lib/supabase/client';

export interface PriceListRow {
  productId: string;
  name: string;
  categoryName: string | null;
  generalPrice: number | null;
  workshopPrice: number | null;
}

export function usePriceList() {
  return useQuery({
    queryKey: ['price-list'],
    queryFn: async (): Promise<PriceListRow[]> => {
      const supabase = createClient();

      // product_list_view belum termasuk harga (product_prices
      // tabel terpisah) — jadi ambil produk aktif dulu, baru
      // gabungkan manual dengan harga di sisi JS. Ini konsisten
      // dengan cara useProducts.ts mengambil product_list_view.
      const { data: products, error: productsError } = await supabase
        .from('product_list_view')
        .select('id, name, category_name')
        .eq('status', 'active')
        .order('category_name')
        .order('name');

      if (productsError) throw productsError;

      const { data: prices, error: pricesError } = await supabase
        .from('product_prices')
        .select('product_id, price_type, price_value');

      if (pricesError) throw pricesError;

      const priceMap = new Map<string, { general?: number; workshop?: number }>();
      for (const p of prices) {
        const entry = priceMap.get(p.product_id) ?? {};
        // 'service' sengaja disamakan dengan 'general' untuk
        // ditampilkan (kesepakatan awal: harga hanya-beli dan
        // plus-pasang sama untuk oli) — kalau nanti dibedakan
        // manual per barang, kolom Umum akan tampilkan harga
        // 'general', bukan 'service'.
        if (p.price_type === 'general') entry.general = p.price_value;
        if (p.price_type === 'workshop') entry.workshop = p.price_value;
        priceMap.set(p.product_id, entry);
      }

      return products.map((p) => ({
        productId: p.id,
        name: p.name,
        categoryName: p.category_name,
        generalPrice: priceMap.get(p.id)?.general ?? null,
        workshopPrice: priceMap.get(p.id)?.workshop ?? null,
      }));
    },
    staleTime: 30 * 1000,
  });
}