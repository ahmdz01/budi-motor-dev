'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { createClient } from '@/shared/lib/supabase/client';
import { callRpc } from '@/shared/lib/supabase/rpc';
import { generateClientUuid } from '@/shared/lib/offline/clientUuid';
import type { ServiceIntakeFormValues } from '../validation/serviceSchema';

interface CreateServiceInput extends ServiceIntakeFormValues {
  customerId: string;
  vehicleId: string | null;
}

export function useCreateService() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: async (input: CreateServiceInput) => {
      const supabase = createClient();

      const result = await callRpc<
        {
          p_client_uuid: string;
          p_customer_id: string;
          p_vehicle_id: string | null;
          p_complaint: string;
          p_customer_type_used: string;
          p_is_warranty_claim: boolean;
        },
        { service_id: string }[]
      >(supabase, 'sp_create_service', {
        p_client_uuid: generateClientUuid(),
        p_customer_id: input.customerId,
        p_vehicle_id: input.vehicleId,
        p_complaint: input.complaint,
        p_customer_type_used: input.customerTypeUsed,
        p_is_warranty_claim: input.isWarrantyClaim,
      });

      if (!result.success) throw new Error(result.error.message);

      return result.data[0].service_id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services'] });
      router.push('/service');
    },
  });
}