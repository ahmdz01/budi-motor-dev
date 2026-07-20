'use client';

import { use, useState } from 'react';
import Link from 'next/link';
import { Pencil, Plus } from 'lucide-react';
import { Button } from '@/shared/components/Button';
import { Badge } from '@/shared/components/Badge';
import { useCustomer } from '@/features/master-data/hooks/useCustomer';
import { useVehicles, useCreateVehicle } from '@/features/master-data/hooks/useVehicles';
import { VehicleListItem } from '@/features/master-data/components/VehicleListItem';
import { VehicleQuickAddForm } from '@/features/master-data/components/VehicleQuickAddForm';

const typeLabel: Record<string, string> = {
  general: 'Umum',
  service: 'Servis',
  workshop: 'Bengkel',
};

export default function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: customer, isLoading, error } = useCustomer(id);
  const { data: vehicles, isLoading: vehiclesLoading } = useVehicles(id);
  const createVehicle = useCreateVehicle(id);
  const [isAddingVehicle, setIsAddingVehicle] = useState(false);

  if (isLoading) return <div className="p-4 text-sm text-neutral-400">Memuat...</div>;
  if (error || !customer)
    return <div className="text-danger-600 p-4 text-sm">Pelanggan tidak ditemukan.</div>;

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold">{customer.name}</h1>
          <p className="text-sm text-neutral-500">{customer.phone_number}</p>
        </div>
        <Link href={`/customers/${id}/edit`}>
          <Button variant="secondary" size="md">
            <Pencil size={16} /> Edit
          </Button>
        </Link>
      </div>

      <div className="flex items-center gap-2">
        <Badge variant="accent">{typeLabel[customer.customer_type]}</Badge>
        {customer.address && <span className="text-sm text-neutral-500">{customer.address}</span>}
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-neutral-700">Kendaraan</h2>
          {!isAddingVehicle && (
            <Button variant="ghost" size="md" onClick={() => setIsAddingVehicle(true)}>
              <Plus size={16} /> Tambah Kendaraan
            </Button>
          )}
        </div>

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

        {vehiclesLoading && <p className="text-sm text-neutral-400">Memuat kendaraan...</p>}

        {vehicles && vehicles.length === 0 && !isAddingVehicle && (
          <p className="text-sm text-neutral-400">Belum ada kendaraan terdaftar.</p>
        )}

        {vehicles && vehicles.length > 0 && (
          <div className="space-y-2">
            {vehicles.map((v) => (
              <VehicleListItem key={v.id} vehicle={v} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}