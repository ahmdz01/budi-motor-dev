'use client';

import { ServiceCatalogForm } from '@/features/settings/components/ServiceCatalogForm';
import { useCreateServiceCatalogItem } from '@/features/settings/hooks/useServiceCatalogMutations';

export default function NewServiceCatalogPage() {
  const createItem = useCreateServiceCatalogItem();

  return (
    <div className="p-4">
      <h1 className="mb-4 text-xl font-semibold">Tambah Jasa</h1>
      <ServiceCatalogForm
        onSubmit={(input) => createItem.mutate(input)}
        isSubmitting={createItem.isPending}
        submitError={createItem.error?.message}
      />
    </div>
  );
}
