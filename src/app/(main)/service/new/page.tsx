'use client';

import { ServiceIntakeForm } from '@/features/service/components/ServiceIntakeForm';
import { useCreateService } from '@/features/service/hooks/useCreateService';

export default function NewServicePage() {
  const createService = useCreateService();

  return (
    <div className="p-4 pb-24">
      <h1 className="mb-4 text-xl font-semibold">Terima Kendaraan Servis</h1>
      <ServiceIntakeForm
        onSubmit={(input) => createService.mutate(input)}
        isSubmitting={createService.isPending}
        submitError={createService.error?.message}
      />
    </div>
  );
}