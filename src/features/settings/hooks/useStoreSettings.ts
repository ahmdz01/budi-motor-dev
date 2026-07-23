'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/shared/lib/supabase/client';
import type { StoreSettings } from '../types';

export function useStoreSettings() {
  return useQuery({
    queryKey: ['store-settings'],
    queryFn: async (): Promise<StoreSettings> => {
      const supabase = createClient();
      // Singleton — tidak perlu filter apa pun, selalu 1 baris.
      const { data, error } = await supabase.from('store_settings').select('*').single();

      if (error) throw error;
      return data as StoreSettings;
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useUpdateStoreSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: Partial<Omit<StoreSettings, 'id'>>) => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const { data: current } = await supabase.from('store_settings').select('id').single();
      if (!current) throw new Error('Data pengaturan tidak ditemukan.');

      const { error } = await supabase
        .from('store_settings')
        .update({ ...input, updated_by: user?.id, updated_at: new Date().toISOString() })
        .eq('id', current.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['store-settings'] });
    },
  });
}
