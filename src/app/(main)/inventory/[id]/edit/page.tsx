'use client';

import { use } from 'react';
import { ProductForm } from '@/features/master-data/components/ProductForm';
import { useProduct } from '@/features/master-data/hooks/useProduct';
import { useUpdateProduct } from '@/features/master-data/hooks/useProductMutations';

export default function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: product, isLoading } = useProduct(id);
  const updateProduct = useUpdateProduct(id);

  if (isLoading || !product) return <div className="p-4 text-sm text-neutral-400">Memuat...</div>;

  const getPriceValue = (type: string) =>
    product.prices.find((p) => p.price_type === type)?.price_value ?? 0;

  return (
    <div className="p-4">
      <h1 className="mb-4 text-xl font-semibold">Edit Barang</h1>
      <ProductForm
        existingProduct={product}
        defaultValues={{
          name: product.name,
          categoryId: product.category_id,
          brandId: product.brand_id,
          locationLabel: product.location_label ?? '',
          minStock: product.min_stock,
          priceGeneral: getPriceValue('general'),
          priceService: getPriceValue('service'),
          priceWorkshop: getPriceValue('workshop'),
        }}
        onSubmit={(input) => updateProduct.mutate(input)}
        isSubmitting={updateProduct.isPending}
        submitError={updateProduct.error?.message}
      />
    </div>
  );
}
