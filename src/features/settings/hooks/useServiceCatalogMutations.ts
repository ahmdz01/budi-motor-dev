'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { createClient } from '@/shared/lib/supabase/client';
import type { ServiceCatalogInput } from '../validation/serviceCatalogSchema';

export function useCreateServiceCatalogItem() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: async (input: ServiceCatalogInput) => {
      const supabase = createClient();
      const { error } = await supabase.from('service_catalog').insert({
        name: input.name,
        default_price: input.defaultPrice,
        warranty_days: input.warrantyDays ?? null,
        status: input.isActive ? 'active' : 'inactive',
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-catalog'] });
      router.push('/settings/service-catalog');
    },
  });
}

export function useUpdateServiceCatalogItem(id: string) {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: async (input: ServiceCatalogInput) => {
      const supabase = createClient();
      const { error } = await supabase
        .from('service_catalog')
        .update({
          name: input.name,
          default_price: input.defaultPrice,
          warranty_days: input.warrantyDays ?? null,
          status: input.isActive ? 'active' : 'inactive',
        })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-catalog'] });
      router.push('/settings/service-catalog');
    },
  });
}
