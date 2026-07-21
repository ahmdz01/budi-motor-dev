'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { getPendingActions } from '@/shared/lib/offline/queue';

import { syncPosTransactions } from '../lib/syncPosTransactions';

export function usePendingSyncCount() {
  return useQuery({
    queryKey: ['offline-pending-count'],
    queryFn: async () => {
      const actions = await getPendingActions();
      // Hitung 'pending' DAN 'failed' — keduanya masih perlu
      // perhatian pengguna, bukan cuma yang murni menunggu giliran.
      return actions.filter((a) => a.status === 'pending' || a.status === 'failed').length;
    },
    refetchInterval: 10 * 1000,
  });
}

export function useSyncOfflineTransactions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => syncPosTransactions(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['offline-pending-count'] });
      queryClient.invalidateQueries({ queryKey: ['products-for-sale'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-metrics'] });
    },
  });
}
