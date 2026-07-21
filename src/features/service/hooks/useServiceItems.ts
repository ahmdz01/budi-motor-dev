'use client';

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/shared/lib/supabase/client';
import type { ServiceItem } from '../types';

export function useServiceItems(serviceId: string) {
  return useQuery({
    queryKey: ['service-items', serviceId],
    queryFn: async (): Promise<ServiceItem[]> => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('service_items')
        .select(
          'id, item_type, product_id, name_snapshot, price_snapshot, qty, subtotal, created_at'
        )
        .eq('service_id', serviceId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data as ServiceItem[];
    },
    enabled: Boolean(serviceId),
  });
}
