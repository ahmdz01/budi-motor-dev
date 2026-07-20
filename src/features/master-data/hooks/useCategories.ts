'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/shared/lib/supabase/client';
import type { Category } from '../types';

export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: async (): Promise<Category[]> => {
      const supabase = createClient();
      const { data, error } = await supabase.from('categories').select('id, name').order('name');

      if (error) throw error;
      return data;
    },
    // Data referensi jarang berubah — staleTime lebih panjang
    // dari default global (30 detik), tidak perlu sering refetch.
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (name: string) => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('categories')
        .insert({ name })
        .select('id, name')
        .single();

      if (error) throw error;
      return data as Category;
    },
    onSuccess: () => {
      // Invalidate cache — memicu refetch otomatis di semua
      // komponen yang pakai useCategories(), tanpa reload manual.
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    },
  });
}
