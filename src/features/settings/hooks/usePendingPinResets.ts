'use client';

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/shared/lib/supabase/client';

export interface PinResetRequest {
  id: string;
  phone_number: string;
  requested_at: string;
}

export function usePendingPinResets() {
  return useQuery({
    queryKey: ['pin-reset-requests'],
    queryFn: async (): Promise<PinResetRequest[]> => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('pin_reset_requests')
        .select('id, phone_number, requested_at')
        .eq('status', 'pending')
        .order('requested_at', { ascending: true });

      if (error) throw error;
      return data as PinResetRequest[];
    },
    staleTime: 15 * 1000,
  });
}
