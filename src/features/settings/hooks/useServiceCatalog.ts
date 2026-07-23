'use client';

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/shared/lib/supabase/client';
import type { ServiceCatalogItem } from '../types';

export function useServiceCatalog(search: string = '') {
  return useQuery({
    queryKey: ['service-catalog', search],
    queryFn: async (): Promise<ServiceCatalogItem[]> => {
      const supabase = createClient();
      let query = supabase
        .from('service_catalog')
        .select('*')
        .order('usage_count', { ascending: false });

      if (search.trim()) {
        query = query.ilike('name', `%${search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;

      return data as ServiceCatalogItem[];
    },
    staleTime: 30 * 1000,
  });
}

export function useServiceCatalogItem(id: string) {
  return useQuery({
    queryKey: ['service-catalog', 'item', id],
    queryFn: async (): Promise<ServiceCatalogItem> => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('service_catalog')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data as ServiceCatalogItem;
    },
    enabled: Boolean(id),
  });
}
