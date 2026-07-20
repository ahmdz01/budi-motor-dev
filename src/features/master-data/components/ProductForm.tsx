'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Input } from '@/shared/components/Input';
import { Button } from '@/shared/components/Button';
import { CategoryBrandCombobox } from './CategoryBrandCombobox';
import { useCategories, useCreateCategory } from '../hooks/useCategories';
import { useBrands, useCreateBrand } from '../hooks/useBrands';
import { productSchema, type ProductInput } from '../validation/productSchema';
import type { ProductDetail } from '../types';

interface ProductFormProps {
  defaultValues?: Partial<ProductInput>;
  existingProduct?: ProductDetail;
  onSubmit: (input: ProductInput) => void;
  isSubmitting: boolean;
  submitError?: string | null;
}

export function ProductForm({
  defaultValues,
  existingProduct,
  onSubmit,
  isSubmitting,
  submitError,
}: ProductFormProps) {
  const { data: categories = [] } = useCategories();
  const { data: brands = [] } = useBrands();
  const createCategory = useCreateCategory();
  const createBrand = useCreateBrand();

  const [categoryId, setCategoryId] = useState<string | null>(defaultValues?.categoryId ?? null);
  const [brandId, setBrandId] = useState<string | null>(defaultValues?.brandId ?? null);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<z.input<typeof productSchema>, unknown, ProductInput>({
    resolver: zodResolver(productSchema),
    defaultValues,
  });

  function submit(data: ProductInput) {
    onSubmit({ ...data, categoryId, brandId });
  }

  return (
    <form onSubmit={handleSubmit(submit)} className="flex flex-col gap-4">
      <Input id="name" label="Nama Barang" {...register('name')} error={errors.name?.message} />

      <CategoryBrandCombobox
        label="Kategori"
        options={categories}
        value={categoryId}
        onChange={(id) => {
          setCategoryId(id);
          setValue('categoryId', id);
        }}
        onCreateNew={(name) => createCategory.mutateAsync(name)}
        isCreating={createCategory.isPending}
      />

      <CategoryBrandCombobox
        label="Merek"
        options={brands}
        value={brandId}
        onChange={(id) => {
          setBrandId(id);
          setValue('brandId', id);
        }}
        onCreateNew={(name) => createBrand.mutateAsync(name)}
        isCreating={createBrand.isPending}
      />

      <Input
        id="locationLabel"
        label="Lokasi Rak (opsional)"
        placeholder="mis. Rak A2"
        {...register('locationLabel')}
        error={errors.locationLabel?.message}
      />

      <Input
        id="minStock"
        label="Stok Minimum (untuk notifikasi)"
        type="number"
        {...register('minStock')}
        error={errors.minStock?.message}
      />

      {!existingProduct && (
        <Input
          id="barcode"
          label="Barcode (opsional — kosongkan untuk generate otomatis)"
          {...register('barcode')}
          error={errors.barcode?.message}
        />
      )}

      <div className="rounded-md border border-neutral-200 p-3">
        <p className="mb-3 text-sm font-medium text-neutral-700">Harga Jual</p>
        <div className="flex flex-col gap-3">
          <Input
            id="priceGeneral"
            label="Harga Umum"
            type="number"
            {...register('priceGeneral')}
            error={errors.priceGeneral?.message}
          />
          <Input
            id="priceService"
            label="Harga Servis"
            type="number"
            {...register('priceService')}
            error={errors.priceService?.message}
          />
          <Input
            id="priceWorkshop"
            label="Harga Bengkel"
            type="number"
            {...register('priceWorkshop')}
            error={errors.priceWorkshop?.message}
          />
        </div>
      </div>

      {submitError && <p className="text-danger-600 text-sm">{submitError}</p>}

      <Button type="submit" isLoading={isSubmitting}>
        Simpan
      </Button>
    </form>
  );
}
