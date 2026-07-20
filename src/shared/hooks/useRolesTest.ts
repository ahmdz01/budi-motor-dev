'use client';

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/shared/lib/supabase/client';

/**
 * SEMENTARA — hook ini murni untuk verifikasi Langkah 8, akan
 * dihapus setelah terkonfirmasi bekerja. Bukan bagian dari
 * fitur bisnis mana pun.
 */
export function useRolesTest() {
  return useQuery({
    queryKey: ['roles-test'],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase.from('roles').select('code, display_name');

      if (error) throw error;
      return data;
    },
  });
}
