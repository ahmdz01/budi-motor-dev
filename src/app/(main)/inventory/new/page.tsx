'use client';

import { useState } from 'react';
import { ProductForm } from '@/features/master-data/components/ProductForm';
import {
  AIProductEntry,
  type AIProductResult,
} from '@/features/master-data/components/AIProductEntry';
import { useCreateProduct } from '@/features/master-data/hooks/useProductMutations';
import { useCategories } from '@/features/master-data/hooks/useCategories';
import { useBrands } from '@/features/master-data/hooks/useBrands';
import type { ProductInput } from '@/features/master-data/validation/productSchema';

export default function NewProductPage() {
  const createProduct = useCreateProduct();

  const { data: categories = [] } = useCategories();
  const { data: brands = [] } = useBrands();

  const [showAI, setShowAI] = useState(false);
  const [aiDraft, setAiDraft] = useState<Partial<ProductInput> | null>(null);

  function handleApplyAI(result: AIProductResult) {
    const matchedCategory = categories.find(
      (category) =>
        category.name.trim().toLowerCase() ===
        result.category?.trim().toLowerCase()
    );

    const matchedBrand = brands.find(
      (brand) =>
        brand.name.trim().toLowerCase() ===
        result.brand?.trim().toLowerCase()
    );

    setAiDraft({
      name: result.name ?? '',
      categoryId: matchedCategory?.id ?? null,
      brandId: matchedBrand?.id ?? null,
      locationLabel: '',
      minStock: 0,
      priceGeneral: 0,
      priceService: 0,
      priceWorkshop: 0,
    });

    setShowAI(false);
  }

  if (showAI) {
    return (
      <div className="p-4">
        <h1 className="mb-4 text-xl font-semibold">
          Tambah Barang dengan AI
        </h1>

        <AIProductEntry
          onCancel={() => setShowAI(false)}
          onApply={handleApplyAI}
        />
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">Tambah Barang</h1>

        <button
          type="button"
          onClick={() => setShowAI(true)}
          className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
        >
          ✨ Tambah dengan AI
        </button>
      </div>

      <ProductForm
        defaultValues={aiDraft ?? undefined}
        onSubmit={(input) => createProduct.mutate(input)}
        isSubmitting={createProduct.isPending}
        submitError={createProduct.error?.message}
      />
    </div>
  );
}