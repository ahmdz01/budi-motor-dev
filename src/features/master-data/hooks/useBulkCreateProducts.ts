'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { createClient } from '@/shared/lib/supabase/client';

interface BulkItem {
  name: string;
  price: number;
}

export function useBulkCreateProducts() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: async ({ categoryId, items }: { categoryId: string; items: BulkItem[] }) => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) throw new Error('Sesi login tidak ditemukan.');

      // Insert seluruh barang dalam 1 kali panggilan (bukan loop satu-satu)
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

      if (productError) {
        throw new Error(productError.message || 'Gagal menyimpan barang.');
      }

      if (!products || products.length === 0) {
        throw new Error('Tidak ada barang yang berhasil disimpan.');
      }

      // Cocokkan produk yang baru dibuat dengan harga aslinya (by nama)
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

      if (priceRows.length > 0) {
        const { error: priceError } = await supabase.from('product_prices').insert(priceRows);
        if (priceError) {
          throw new Error(priceError.message || 'Gagal menyimpan harga barang.');
        }
      }

      return products.length;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      router.push('/inventory');
    },
  });
}