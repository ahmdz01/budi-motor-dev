'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Input } from '@/shared/components/Input';
import { Button } from '@/shared/components/Button';
import { vehicleSchema, type VehicleInput } from '../validation/vehicleSchema';

interface VehicleQuickAddFormProps {
  onSubmit: (input: VehicleInput) => void;
  onCancel: () => void;
  isSubmitting: boolean;
}

export function VehicleQuickAddForm({
  onSubmit,
  onCancel,
  isSubmitting,
}: VehicleQuickAddFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<VehicleInput>({ resolver: zodResolver(vehicleSchema) });

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="flex flex-col gap-3 rounded-md border border-neutral-200 p-3"
    >
      <Input
        id="policePlate"
        label="Plat Nomor (opsional)"
        {...register('policePlate')}
        error={errors.policePlate?.message}
      />
      <Input
        id="motorBrand"
        label="Merek Motor"
        {...register('motorBrand')}
        error={errors.motorBrand?.message}
      />
      <Input
        id="motorModel"
        label="Model Motor"
        {...register('motorModel')}
        error={errors.motorModel?.message}
      />
      <Input
        id="notes"
        label="Catatan (opsional)"
        {...register('notes')}
        error={errors.notes?.message}
      />
      <div className="flex gap-2">
        <Button type="submit" size="md" isLoading={isSubmitting}>
          Simpan Kendaraan
        </Button>
        <Button type="button" variant="secondary" size="md" onClick={onCancel}>
          Batal
        </Button>
      </div>
    </form>
  );
}