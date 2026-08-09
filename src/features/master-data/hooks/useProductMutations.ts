'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { createClient } from '@/shared/lib/supabase/client';
import { logger } from '@/shared/lib/logger';
import type { ProductInput } from '../validation/productSchema';

const PRICE_TYPES = ['general', 'service', 'workshop'] as const;

export function useCreateProduct() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: async (input: ProductInput) => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) throw new Error('Sesi login tidak ditemukan.');

      const { data: product, error: productError } = await supabase
        .from('products')
        .insert({
          name: input.name,
          category_id: input.categoryId,
          brand_id: input.brandId,
          location_label: input.locationLabel || null,
          min_stock: input.minStock,
          barcode: input.barcode || null,
          created_by: user.id,
        })
        .select('id')
        .single();

      if (productError) throw productError;

      const priceRows = [
        {
          product_id: product.id,
          price_type: 'general',
          price_value: input.priceGeneral,
          updated_by: user.id,
        },
        {
          product_id: product.id,
          price_type: 'service',
          price_value: input.priceService,
          updated_by: user.id,
        },
        {
          product_id: product.id,
          price_type: 'workshop',
          price_value: input.priceWorkshop,
          updated_by: user.id,
        },
      ];

      const { error: priceError } = await supabase.from('product_prices').insert(priceRows);

      if (priceError) {
        // Produk sudah tersimpan tapi harga gagal — sesuai keputusan
        // trade-off Langkah 4.2, ini bukan kegagalan fatal. Dicatat
        // untuk ditindaklanjuti manual (Admin lengkapi lewat Edit).
        logger.error('Gagal menyimpan harga produk setelah produk dibuat', {
          productId: product.id,
          error: priceError.message,
        });
        throw new Error(
          'Barang tersimpan, tapi harga gagal disimpan. Silakan lengkapi lewat Edit Barang.'
        );
      }

      return product.id;
    },
    onSuccess: (productId) => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      router.push(`/inventory/${productId}`);
    },
  });
}

export function useUpdateProduct(productId: string) {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: async (input: ProductInput) => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) throw new Error('Sesi login tidak ditemukan.');

      const { error: productError } = await supabase
        .from('products')
        .update({
          name: input.name,
          category_id: input.categoryId,
          brand_id: input.brandId,
          location_label: input.locationLabel || null,
          min_stock: input.minStock,
        })
        .eq('id', productId);

      if (productError) throw productError;

      for (const priceType of PRICE_TYPES) {
        const value =
          priceType === 'general'
            ? input.priceGeneral
            : priceType === 'service'
              ? input.priceService
              : input.priceWorkshop;

        const { error: priceError } = await supabase
          .from('product_prices')
          .update({ price_value: value, updated_by: user.id })
          .eq('product_id', productId)
          .eq('price_type', priceType);

        if (priceError) throw priceError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['product', productId] });
      router.push(`/inventory/${productId}`);
    },
  });
}

export function useDeactivateProduct() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: async (productId: string) => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) throw new Error('Sesi login tidak ditemukan.');

      // Soft delete — bukan tabel finansial inti, jadi cukup RLS
      // biasa (dibatasi role Admin/Owner), tidak perlu RPC.
      // Barang tidak dihapus fisik, hanya disembunyikan dari daftar
      // operasional (useProducts sudah filter status = 'active').
      const { error } = await supabase
        .from('products')
        .update({ status: 'inactive' })
        .eq('id', productId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      router.push('/inventory');
    },
  });
}
