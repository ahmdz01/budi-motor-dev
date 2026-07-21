'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/shared/lib/supabase/client';

interface QuickCustomerInput {
  name: string;
  phoneNumber: string;
}

// Sengaja duplikat dari versi POS (src/features/pos/hooks/useQuickCreateCustomer.ts)
// alih-alih diimpor lintas-fitur — POS dan Service sengaja didesain
// tidak saling bergantung satu sama lain. Hook ini juga sengaja TIDAK
// reuse useCreateCustomer dari master-data karena hook itu otomatis
// redirect ke /customers/[id], sementara di sini kita cuma perlu
// ID+nama-nya langsung dipasang ke form intake.
export function useQuickCreateCustomer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: QuickCustomerInput) => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('customers')
        .insert({ name: input.name, phone_number: input.phoneNumber, customer_type: 'general' })
        .select('id, name')
        .single();

      if (error) throw error;
      return data as { id: string; name: string };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
  });
}