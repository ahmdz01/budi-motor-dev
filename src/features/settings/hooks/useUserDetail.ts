'use client';

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/shared/lib/supabase/client';
import type { UserListItem } from './useUsers';

export function useUserDetail(id: string) {
  return useQuery({
    queryKey: ['user', id],
    queryFn: async (): Promise<UserListItem> => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('users')
        .select('id, phone_number, name, role_code, status, last_login_at')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data as UserListItem;
    },
    enabled: Boolean(id),
  });
}
