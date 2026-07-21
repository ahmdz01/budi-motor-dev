'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus } from 'lucide-react';
import { Card } from '@/shared/components/Card';
import { Button } from '@/shared/components/Button';
import { useVehicles, useCreateVehicle } from '@/features/master-data/hooks/useVehicles';
import { VehicleQuickAddForm } from '@/features/master-data/components/VehicleQuickAddForm';
import { CustomerPicker } from './CustomerPicker';
import {
  serviceIntakeFormSchema,
  type ServiceIntakeFormValues,
} from '../validation/serviceSchema';

const customerTypeOptions: { value: ServiceIntakeFormValues['customerTypeUsed']; label: string }[] = [
  { value: 'general', label: 'Umum' },
  { value: 'service', label: 'Servis' },
  { value: 'workshop', label: 'Bengkel' },
];

interface ServiceIntakeFormProps {
  onSubmit: (input: ServiceIntakeFormValues & { customerId: string; vehicleId: string | null }) => void;
  isSubmitting: boolean;
  submitError?: string | null;
}

export function ServiceIntakeForm({ onSubmit, isSubmitting, submitError }: ServiceIntakeFormProps) {
  const [customer, setCustomer] = useState<{ id: string; name: string } | null>(null);
  const [vehicleId, setVehicleId] = useState<string | null>(null);
  const [isAddingVehicle, setIsAddingVehicle] = useState(false);
  const [customerError, setCustomerError] = useState<string | null>(null);

  const { data: vehicles } = useVehicles(customer?.id ?? '');
  const createVehicle = useCreateVehicle(customer?.id ?? '');

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<z.input<typeof serviceIntakeFormSchema>, unknown, ServiceIntakeFormValues>({
    resolver: zodResolver(serviceIntakeFormSchema),
    defaultValues: { customerTypeUsed: 'service', isWarrantyClaim: false },
  });

  const customerTypeUsed = watch('customerTypeUsed');

  function handleSelectCustomer(next: { id: string; name: string } | null) {
    setCustomer(next);
    setVehicleId(null);
    setCustomerError(null);
  }

  function submit(data: ServiceIntakeFormValues) {
    if (!customer) {
      setCustomerError('Pelanggan wajib dipilih.');
      return;
    }

    onSubmit({ ...data, customerId: customer.id, vehicleId });
  }

  return (
    <form onSubmit={handleSubmit(submit)} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-neutral-700">Pelanggan</label>
        <CustomerPicker value={customer} onChange={handleSelectCustomer} />
        {customerError && <span className="text-danger-600 text-sm">{customerError}</span>}
      </div>

      {customer && (
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-neutral-700">Kendaraan (opsional)</label>

          <div className="flex flex-col gap-1.5">
            <button
              type="button"
              onClick={() => setVehicleId(null)}
              className={`rounded-md border p-2.5 text-left text-sm ${
                vehicleId === null
                  ? 'border-accent-600 bg-accent-50 text-accent-700'
                  : 'border-neutral-300 text-neutral-600'
              }`}
            >
              Tanpa data kendaraan
            </button>

            {vehicles?.map((v) => {
              const label = [v.police_plate, [v.motor_brand, v.motor_model].filter(Boolean).join(' ')]
                .filter(Boolean)
                .join(' · ');

              return (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => setVehicleId(v.id)}
                  className={`rounded-md border p-2.5 text-left text-sm ${
                    vehicleId === v.id
                      ? 'border-accent-600 bg-accent-50 text-accent-700'
                      : 'border-neutral-300 text-neutral-600'
                  }`}
                >
                  {label || 'Kendaraan tanpa detail'}
                </button>
              );
            })}
          </div>

          {!isAddingVehicle && (
            <Button type="button" variant="ghost" size="md" onClick={() => setIsAddingVehicle(true)}>
              <Plus size={16} /> Tambah kendaraan baru
            </Button>
          )}

          {isAddingVehicle && (
            <VehicleQuickAddForm
              isSubmitting={createVehicle.isPending}
              onCancel={() => setIsAddingVehicle(false)}
              onSubmit={(input) =>
                createVehicle.mutate(input, {
                  onSuccess: () => setIsAddingVehicle(false),
                })
              }
            />
          )}
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <label htmlFor="complaint" className="text-sm font-medium text-neutral-700">
          Keluhan
        </label>
        <textarea
          id="complaint"
          rows={3}
          placeholder="Contoh: rem depan bunyi, oli rembes..."
          {...register('complaint')}
          className="focus:border-accent-500 focus:ring-accent-100 rounded-md border border-neutral-300 px-4 py-2.5 text-base focus:ring-2 focus:outline-none"
        />
        {errors.complaint && (
          <span className="text-danger-600 text-sm">{errors.complaint.message}</span>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-neutral-700">Tipe Harga</label>
        <div className="flex gap-2">
          {customerTypeOptions.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setValue('customerTypeUsed', opt.value)}
              className={`flex-1 rounded-md border py-2 text-sm font-medium ${
                customerTypeUsed === opt.value
                  ? 'border-accent-600 bg-accent-50 text-accent-700'
                  : 'border-neutral-300 text-neutral-600'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <Card className="flex items-center justify-between p-3">
        <label htmlFor="isWarrantyClaim" className="text-sm font-medium text-neutral-700">
          Klaim Garansi
        </label>
        <input
          id="isWarrantyClaim"
          type="checkbox"
          {...register('isWarrantyClaim')}
          className="h-5 w-5 accent-accent-600"
        />
      </Card>

      {submitError && <p className="text-danger-600 text-sm">{submitError}</p>}

      <Button type="submit" isLoading={isSubmitting}>
        Terima Kendaraan
      </Button>
    </form>
  );
}