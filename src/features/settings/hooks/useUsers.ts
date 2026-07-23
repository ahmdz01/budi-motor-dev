'use client';

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/shared/lib/supabase/client';
import type { RoleCode } from '@/shared/constants/roleAccess';

export interface UserListItem {
  id: string;
  phone_number: string;
  name: string;
  role_code: RoleCode;
  status: 'active' | 'inactive';
  last_login_at: string | null;
}

export function useUsers() {
  return useQuery({
    queryKey: ['users'],
    queryFn: async (): Promise<UserListItem[]> => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('users')
        .select('id, phone_number, name, role_code, status, last_login_at')
        .order('name');

      if (error) throw error;
      return data as UserListItem[];
    },
    staleTime: 30 * 1000,
  });
}
