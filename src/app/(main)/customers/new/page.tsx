'use client';

import { CustomerForm } from '@/features/master-data/components/CustomerForm';
import { useCreateCustomer } from '@/features/master-data/hooks/useCustomerMutations';

export default function NewCustomerPage() {
  const createCustomer = useCreateCustomer();

  return (
    <div className="p-4">
      <h1 className="mb-4 text-xl font-semibold">Tambah Pelanggan</h1>
      <CustomerForm
        onSubmit={(input) => createCustomer.mutate(input)}
        isSubmitting={createCustomer.isPending}
        submitError={createCustomer.error?.message}
      />
    </div>
  );
}