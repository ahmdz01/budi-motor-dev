
'use client';

import { useEffect, useRef } from 'react';

import { logger } from '@/shared/lib/logger';
import {
  getPendingActions,
  isOfflineActionRetryDue,
} from '@/shared/lib/offline/queue';
import { useOnlineStatus } from '@/shared/hooks/useOnlineStatus';

import { useSyncOfflineTransactions } from '../hooks/useOfflineSync';

const RECOVERY_CHECK_INTERVAL_MS = 30_000;
const STALE_SYNC_AFTER_MS = 60_000;

export function OfflineSyncManager() {
  const isOnline = useOnlineStatus();
  const { mutate: sync } = useSyncOfflineTransactions();

  const hasSyncedOnMount = useRef(false);
  const wasOffline = useRef(false);

  useEffect(() => {
    if (!isOnline) {
      wasOffline.current = true;
      return;
    }

    const reconnecting = wasOffline.current;
    wasOffline.current = false;

    if (!hasSyncedOnMount.current) {
      hasSyncedOnMount.current = true;
      sync(undefined);
    } else if (reconnecting) {
      sync(undefined);
    }

    const intervalId = window.setInterval(() => {
      void getPendingActions()
        .then((actions) => {
          const now = Date.now();

          const shouldSync = actions.some((action) => {
            if (action.entityType !== 'pos_transaction') {
              return false;
            }

            // Transaksi baru yang belum pernah diproses.
            if (action.status === 'pending') {
              return true;
            }

            // Kegagalan sementara hanya dicoba ketika waktunya tiba.
            if (
              action.status === 'failed' &&
              action.lastErrorRetryable === true
            ) {
              return isOfflineActionRetryDue(action, now);
            }

            // Kegagalan permanen menunggu tindakan manual pengguna.
            if (action.status !== 'syncing') {
              return false;
            }

            // Pulihkan proses yang kemungkinan berhenti di tengah jalan.
            if (!action.syncStartedAt) {
              return true;
            }

            const startedAt = Date.parse(action.syncStartedAt);

            return (
              !Number.isFinite(startedAt) ||
              now - startedAt >= STALE_SYNC_AFTER_MS
            );
          });

          if (shouldSync) {
            sync(undefined);
          }
        })
        .catch((error) => {
          logger.warn('Gagal memeriksa antrean offline', {
            error:
              error instanceof Error
                ? error.message
                : String(error),
          });
        });
    }, RECOVERY_CHECK_INTERVAL_MS);

    return () => window.clearInterval(intervalId);
  }, [isOnline, sync]);

  return null;
}
