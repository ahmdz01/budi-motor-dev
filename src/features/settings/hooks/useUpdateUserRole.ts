'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/shared/lib/supabase/client';
import { callRpc } from '@/shared/lib/supabase/rpc';

export function useUpdateUserRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, newRole }: { userId: string; newRole: string }) => {
      const supabase = createClient();

      const result = await callRpc<{ p_user_id: string; p_new_role: string }, null>(
        supabase,
        'sp_update_user_role',
        { p_user_id: userId, p_new_role: newRole }
      );

      if (!result.success) throw new Error(result.error.message);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['user', variables.userId] });
    },
  });
}
