'use client';

import { use } from 'react';
import { ServiceCatalogForm } from '@/features/settings/components/ServiceCatalogForm';
import { useServiceCatalogItem } from '@/features/settings/hooks/useServiceCatalog';
import { useUpdateServiceCatalogItem } from '@/features/settings/hooks/useServiceCatalogMutations';

export default function EditServiceCatalogPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: item, isLoading, error } = useServiceCatalogItem(id);
  const updateItem = useUpdateServiceCatalogItem(id);

  if (isLoading) return <div className="p-4 text-sm text-neutral-400">Memuat...</div>;
  if (error || !item)
    return <div className="text-danger-600 p-4 text-sm">Jasa tidak ditemukan.</div>;

  return (
    <div className="p-4">
      <h1 className="mb-4 text-xl font-semibold">Edit Jasa</h1>
      <ServiceCatalogForm
        defaultValues={{
          name: item.name,
          defaultPrice: item.default_price,
          warrantyDays: item.warranty_days ?? undefined,
          isActive: item.status === 'active',
        }}
        usageCount={item.usage_count}
        onSubmit={(input) => updateItem.mutate(input)}
        isSubmitting={updateItem.isPending}
        submitError={updateItem.error?.message}
      />
    </div>
  );
}
