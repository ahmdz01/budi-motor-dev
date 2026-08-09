'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/shared/lib/supabase/client';

interface BulkItem {
  name: string;
  price: number;
}

export function useBulkCreateProducts() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ categoryId, items }: { categoryId: string; items: BulkItem[] }) => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) throw new Error('Sesi login tidak ditemukan.');

      // Insert seluruh barang dalam 1 kali panggilan (bukan loop satu-satu)
      // — jauh lebih cepat untuk puluhan item sekaligus.
      const { data: products, error: productError } = await supabase
        .from('products')
        .insert(
          items.map((item) => ({
            name: item.name,
            category_id: categoryId,
            created_by: user.id,
          }))
        )
        .select('id, name');

      if (productError) throw productError;

      // Cocokkan produk yang baru dibuat dengan harga aslinya (by nama),
      // lalu buat 3 baris harga (Umum/Servis/Bengkel) untuk SETIAP produk
      // — sesuai kesepakatan: harga sama di ketiga tipe untuk input cepat.
      const priceRows = products.flatMap((p) => {
        const original = items.find((i) => i.name === p.name);
        if (!original) return [];
        return (['general', 'service', 'workshop'] as const).map((priceType) => ({
          product_id: p.id,
          price_type: priceType,
          price_value: original.price,
          updated_by: user.id,
        }));
      });

      const { error: priceError } = await supabase.from('product_prices').insert(priceRows);

      if (priceError) throw priceError;

      return products.length;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}