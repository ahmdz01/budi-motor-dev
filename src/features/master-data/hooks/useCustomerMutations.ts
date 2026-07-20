'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { createClient } from '@/shared/lib/supabase/client';
import type { CustomerInput } from '../validation/customerSchema';

export function useCreateCustomer() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: async (input: CustomerInput) => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('customers')
        .insert({
          name: input.name,
          phone_number: input.phoneNumber,
          customer_type: input.customerType,
          address: input.address || null,
        })
        .select('id')
        .single();

      if (error) throw error;
      return data.id as string;
    },
    onSuccess: (customerId) => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      router.push(`/customers/${customerId}`);
    },
  });
}

export function useUpdateCustomer(customerId: string) {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: async (input: CustomerInput) => {
      const supabase = createClient();
      const { error } = await supabase
        .from('customers')
        .update({
          name: input.name,
          phone_number: input.phoneNumber,
          customer_type: input.customerType,
          address: input.address || null,
        })
        .eq('id', customerId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['customer', customerId] });
      router.push(`/customers/${customerId}`);
    },
  });
}