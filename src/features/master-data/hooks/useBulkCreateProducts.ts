'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/shared/lib/supabase/client';

interface BulkItem {
  name: string;
  brandName: string; // boleh string kosong = tanpa merek
  priceSell: number;
  priceCost: number;
  qty: number;
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

      // Langkah 0: kumpulkan nama merek unik (yang tidak kosong) dari
      // seluruh baris, cari yang sudah ada di database, buat yang
      // belum ada — supaya "Federal" yang muncul 5x di 5 baris tidak
      // bikin 5 baris merek duplikat.
      const uniqueBrandNames = [
        ...new Set(items.map((i) => i.brandName.trim()).filter((b) => b.length > 0)),
      ];

      const brandIdByName = new Map<string, string>();

      if (uniqueBrandNames.length > 0) {
        const { data: existingBrands, error: brandFetchError } = await supabase
          .from('brands')
          .select('id, name')
          .in('name', uniqueBrandNames);

        if (brandFetchError) throw brandFetchError;

        for (const b of existingBrands) {
          brandIdByName.set(b.name.toLowerCase(), b.id);
        }

        const namesToCreate = uniqueBrandNames.filter(
          (name) => !brandIdByName.has(name.toLowerCase())
        );

        if (namesToCreate.length > 0) {
          const { data: newBrands, error: brandCreateError } = await supabase
            .from('brands')
            .insert(namesToCreate.map((name) => ({ name })))
            .select('id, name');

          if (brandCreateError) throw brandCreateError;

          for (const b of newBrands) {
            brandIdByName.set(b.name.toLowerCase(), b.id);
          }
        }
      }

      // Langkah 1: buat seluruh barang (dengan brand_id kalau ada) +
      // 3 tingkat harga jual sekaligus.
      const { data: products, error: productError } = await supabase
        .from('products')
        .insert(
          items.map((item) => ({
            name: item.name,
            category_id: categoryId,
            brand_id: item.brandName.trim()
              ? (brandIdByName.get(item.brandName.trim().toLowerCase()) ?? null)
              : null,
            created_by: user.id,
          }))
        )
        .select('id, name');

      if (productError) throw productError;

      const priceRows = products.flatMap((p) => {
        const original = items.find((i) => i.name === p.name);
        if (!original) return [];
        return (['general', 'service', 'workshop'] as const).map((priceType) => ({
          product_id: p.id,
          price_type: priceType,
          price_value: original.priceSell,
          updated_by: user.id,
        }));
      });

      const { error: priceError } = await supabase.from('product_prices').insert(priceRows);

      if (priceError) throw priceError;

      // Langkah 2: isi stok fisik sekaligus lewat sp_stock_opname_adjust.
      const opnameItems = products
        .map((p) => {
          const original = items.find((i) => i.name === p.name);
          if (!original || original.qty <= 0) return null;
          return {
            product_id: p.id,
            stok_fisik: original.qty,
            reason: 'Input data awal',
            harga_beli_baru: original.priceCost,
          };
        })
        .filter((x): x is NonNullable<typeof x> => x !== null);

      if (opnameItems.length > 0) {
        const { error: opnameError } = await supabase.rpc('sp_stock_opname_adjust', {
          p_scope_type: 'manual',
          p_scope_value: 'Input data awal (Tambah Banyak Barang)',
          p_items: opnameItems,
        });

        if (opnameError) {
          throw new Error(
            `Barang tersimpan, tapi gagal isi stok: ${opnameError.message}. Lengkapi manual lewat Stock Opname.`
          );
        }
      }

      return products.length;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['brands'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-metrics'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-report-summary'] });
    },
  });
}