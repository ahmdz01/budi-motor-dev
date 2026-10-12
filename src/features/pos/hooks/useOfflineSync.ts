
'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { getPendingActions } from '@/shared/lib/offline/queue';
import { syncPosTransactions } from '../lib/syncPosTransactions';

export function usePendingSyncCount() {
  return useQuery({
    queryKey: ['offline-pending-count'],
    queryFn: async () => {
      const actions = await getPendingActions();

      return actions.filter(
        (action) =>
          action.entityType === 'pos_transaction' &&
          (
            action.status === 'pending' ||
            action.status === 'syncing' ||
            action.status === 'failed'
          ),
      ).length;
    },
    refetchInterval: 10_000,
  });
}

export function useSyncOfflineTransactions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (clientUuid?: string | void) =>
      syncPosTransactions(clientUuid ?? undefined),

    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ['offline-pending-count'],
        }),
        queryClient.invalidateQueries({
          queryKey: ['offline-pending-actions'],
        }),
        queryClient.invalidateQueries({
          queryKey: ['products-for-sale'],
        }),
        queryClient.invalidateQueries({
          queryKey: ['products'],
        }),
        queryClient.invalidateQueries({
          queryKey: ['dashboard-metrics'],
        }),
      ]);
    },
  });
}