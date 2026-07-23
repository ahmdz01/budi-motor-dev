'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card } from '@/shared/components/Card';
import { Input } from '@/shared/components/Input';
import { Button } from '@/shared/components/Button';
import { serviceCatalogSchema, type ServiceCatalogInput } from '../validation/serviceCatalogSchema';

interface ServiceCatalogFormProps {
  defaultValues?: Partial<ServiceCatalogInput>;
  usageCount?: number;
  onSubmit: (input: ServiceCatalogInput) => void;
  isSubmitting: boolean;
  submitError?: string | null;
}

export function ServiceCatalogForm({
  defaultValues,
  usageCount,
  onSubmit,
  isSubmitting,
  submitError,
}: ServiceCatalogFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<z.input<typeof serviceCatalogSchema>, unknown, ServiceCatalogInput>({
    resolver: zodResolver(serviceCatalogSchema),
    defaultValues: { isActive: true, ...defaultValues },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <Input id="name" label="Nama Jasa" {...register('name')} error={errors.name?.message} />

      <Input
        id="defaultPrice"
        label="Harga Default"
        type="number"
        {...register('defaultPrice')}
        error={errors.defaultPrice?.message}
      />

      <Input
        id="warrantyDays"
        label="Garansi (hari, opsional)"
        type="number"
        placeholder="Kosongkan kalau tidak ada garansi"
        {...register('warrantyDays')}
        error={errors.warrantyDays?.message}
      />

      <Card className="flex items-center justify-between p-3">
        <label htmlFor="isActive" className="text-sm font-medium text-neutral-700">
          Aktif (muncul saat dipilih di Servis)
        </label>
        <input
          id="isActive"
          type="checkbox"
          {...register('isActive')}
          className="accent-accent-600 h-5 w-5"
        />
      </Card>

      {usageCount !== undefined && (
        <p className="text-xs text-neutral-400">
          Sudah dipakai {usageCount}x — data ini cuma informasi, tidak bisa diubah manual.
        </p>
      )}

      {submitError && <p className="text-danger-600 text-sm">{submitError}</p>}

      <Button type="submit" isLoading={isSubmitting}>
        Simpan
      </Button>
    </form>
  );
}
