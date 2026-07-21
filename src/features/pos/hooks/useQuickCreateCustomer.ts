'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/shared/lib/supabase/client';

interface QuickCustomerInput {
  name: string;
  phoneNumber: string;
}

// Sengaja TIDAK reuse useCreateCustomer dari master-data — hook itu
// otomatis redirect ke /customers/[id] (dibuat untuk halaman Master
// Data), sementara di POS kita cuma perlu ID+nama-nya langsung
// dipasang ke cart tanpa pindah halaman.
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
