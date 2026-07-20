'use client';

import { use } from 'react';
import { CustomerForm } from '@/features/master-data/components/CustomerForm';
import { useCustomer } from '@/features/master-data/hooks/useCustomer';
import { useUpdateCustomer } from '@/features/master-data/hooks/useCustomerMutations';

export default function EditCustomerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: customer, isLoading } = useCustomer(id);
  const updateCustomer = useUpdateCustomer(id);

  if (isLoading || !customer)
    return <div className="p-4 text-sm text-neutral-400">Memuat...</div>;

  return (
    <div className="p-4">
      <h1 className="mb-4 text-xl font-semibold">Edit Pelanggan</h1>
      <CustomerForm
        defaultValues={{
          name: customer.name,
          phoneNumber: customer.phone_number,
          customerType: customer.customer_type,
          address: customer.address ?? '',
        }}
        onSubmit={(input) => updateCustomer.mutate(input)}
        isSubmitting={updateCustomer.isPending}
        submitError={updateCustomer.error?.message}
      />
    </div>
  );
}