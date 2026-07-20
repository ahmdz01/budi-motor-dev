'use client';

import { ProductForm } from '@/features/master-data/components/ProductForm';
import { useCreateProduct } from '@/features/master-data/hooks/useProductMutations';

export default function NewProductPage() {
  const createProduct = useCreateProduct();

  return (
    <div className="p-4">
      <h1 className="mb-4 text-xl font-semibold">Tambah Barang</h1>
      <ProductForm
        onSubmit={(input) => createProduct.mutate(input)}
        isSubmitting={createProduct.isPending}
        submitError={createProduct.error?.message}
      />
    </div>
  );
}
