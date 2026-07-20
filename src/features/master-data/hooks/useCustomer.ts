'use client';

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/shared/lib/supabase/client';
import type { Customer } from '../types';

export function useCustomer(id: string) {
  return useQuery({
    queryKey: ['customer', id],
    queryFn: async (): Promise<Customer> => {
      const supabase = createClient();
      const { data, error } = await supabase.from('customers').select('*').eq('id', id).single();

      if (error) throw error;
      return data as Customer;
    },
    enabled: !!id,
  });
}