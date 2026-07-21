'use client';

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/shared/lib/supabase/client';
import type { ServiceListItem } from '../types';

interface UseServicesParams {
  search?: string;
}

export function useServices({ search = '' }: UseServicesParams = {}) {
  return useQuery({
    queryKey: ['services', search],
    queryFn: async (): Promise<ServiceListItem[]> => {
      const supabase = createClient();
      let query = supabase
        .from('service_list_view')
        .select('*')
        .order('created_at', { ascending: false });

      // Multi-kriteria: nama pelanggan ATAU plat nomor — pola sama
      // seperti pencarian Barang (4.2) dan Supplier (4.3).
      if (search.trim()) {
        query = query.or(`customer_name.ilike.%${search}%,police_plate.ilike.%${search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;

      return data as ServiceListItem[];
    },
    staleTime: 30 * 1000,
  });
}