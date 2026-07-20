'use client';

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/shared/lib/supabase/client';
import type { Customer } from '../types';

interface UseCustomersParams {
  search?: string;
}

export function useCustomers({ search = '' }: UseCustomersParams = {}) {
  return useQuery({
    queryKey: ['customers', search],
    queryFn: async (): Promise<Customer[]> => {
      const supabase = createClient();
      let query = supabase.from('customers').select('*').eq('status', 'active').order('name');

      // Multi-kriteria: nama ATAU nomor HP — pola sama seperti
      // pencarian Barang (Langkah 4.2) dan Supplier (Langkah 4.3).
      if (search.trim()) {
        query = query.or(`name.ilike.%${search}%,phone_number.ilike.%${search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;

      return data as Customer[];
    },
    staleTime: 30 * 1000,
  });
}