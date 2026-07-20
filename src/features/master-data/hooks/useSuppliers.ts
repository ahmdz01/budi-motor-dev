'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/shared/lib/supabase/client';
import type { Supplier } from '../types';

interface UseSuppliersParams {
  search?: string;
}

export function useSuppliers({ search = '' }: UseSuppliersParams = {}) {
  return useQuery({
    queryKey: ['suppliers', search],
    queryFn: async (): Promise<Supplier[]> => {
      const supabase = createClient();
      let query = supabase.from('suppliers').select('*').eq('status', 'active').order('name');

      if (search.trim()) {
        query = query.ilike('name', `%${search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;

      return data as Supplier[];
    },
    staleTime: 30 * 1000,
  });
}

export function useCreateSupplier() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (name: string) => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('suppliers')
        .insert({ name })
        .select('id, name')
        .single();

      if (error) throw error;
      return data as { id: string; name: string };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
    },
  });
}