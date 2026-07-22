'use client';

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/shared/lib/supabase/client';

export function useReturnedQty(transactionItemId?: string, serviceItemId?: string) {
  return useQuery({
    queryKey: ['returned-qty', transactionItemId ?? serviceItemId],
    queryFn: async (): Promise<number> => {
      const supabase = createClient();
      let query = supabase.from('returns').select('qty_returned');

      query = transactionItemId
        ? query.eq('transaction_item_id', transactionItemId)
        : query.eq('service_item_id', serviceItemId!);

      const { data, error } = await query;
      if (error) throw error;

      return (data ?? []).reduce((sum, r) => sum + r.qty_returned, 0);
    },
    enabled: Boolean(transactionItemId || serviceItemId),
  });
}
