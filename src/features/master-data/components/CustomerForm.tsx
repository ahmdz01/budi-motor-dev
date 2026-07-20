'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Input } from '@/shared/components/Input';
import { Button } from '@/shared/components/Button';
import { customerSchema, type CustomerInput } from '../validation/customerSchema';

interface CustomerFormProps {
  defaultValues?: Partial<CustomerInput>;
  onSubmit: (input: CustomerInput) => void;
  isSubmitting: boolean;
  submitError?: string | null;
}

export function CustomerForm({
  defaultValues,
  onSubmit,
  isSubmitting,
  submitError,
}: CustomerFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<z.input<typeof customerSchema>, unknown, CustomerInput>({
    resolver: zodResolver(customerSchema),
    defaultValues: { customerType: 'general', ...defaultValues },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <Input id="name" label="Nama Pelanggan" {...register('name')} error={errors.name?.message} />

      <Input
        id="phoneNumber"
        label="Nomor HP"
        inputMode="numeric"
        {...register('phoneNumber')}
        error={errors.phoneNumber?.message}
      />

      <div className="flex flex-col gap-1.5">
        <label htmlFor="customerType" className="text-sm font-medium text-neutral-700">
          Tipe Pelanggan
        </label>
        <select
          id="customerType"
          {...register('customerType')}
          className="focus:border-accent-500 focus:ring-accent-100 rounded-md border border-neutral-300 px-4 py-2.5 text-base focus:ring-2 focus:outline-none"
        >
          <option value="general">Umum</option>
          <option value="service">Servis</option>
          <option value="workshop">Bengkel</option>
        </select>
      </div>

      <Input
        id="address"
        label="Alamat (opsional)"
        {...register('address')}
        error={errors.address?.message}
      />

      {submitError && <p className="text-danger-600 text-sm">{submitError}</p>}

      <Button type="submit" isLoading={isSubmitting}>
        Simpan
      </Button>
    </form>
  );
}