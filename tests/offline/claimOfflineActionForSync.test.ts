
import { randomUUID } from 'node:crypto';
import { afterEach, describe, expect, it } from 'vitest';

import {
  getOfflineDb,
  type PendingAction,
} from '@/shared/lib/offline/db';

import {
  claimOfflineActionForSync,
  updateActionStatus,
} from '@/shared/lib/offline/queue';

const testActionIds = new Set<string>();

function makeAction(
  overrides: Partial<PendingAction> = {},
): PendingAction {
  const clientUuid = randomUUID();
  testActionIds.add(clientUuid);

  return {
    clientUuid,
    entityType: 'pos_transaction',
    payload: {
      p_client_uuid: clientUuid,
    },
    createdAt: new Date().toISOString(),
    status: 'pending',
    ...overrides,
  };
}

afterEach(async () => {
  const db = await getOfflineDb();
  const ids = [...testActionIds];
  testActionIds.clear();

  await Promise.all(
    ids.map((id) => db.delete('pending_actions', id)),
  );
});

describe('claimOfflineActionForSync', () => {
  it('memulihkan antrean syncing yang sudah macet', async () => {
    const db = await getOfflineDb();

    const action = makeAction({
      status: 'syncing',
      syncStartedAt: new Date(
        Date.now() - 120_000,
      ).toISOString(),
    });

    await db.put('pending_actions', action);

    const claimed = await claimOfflineActionForSync(
      action.clientUuid,
    );

    expect(claimed).not.toBeNull();
    expect(claimed?.status).toBe('syncing');

    expect(
      Date.parse(claimed!.syncStartedAt!),
    ).toBeGreaterThan(
      Date.parse(action.syncStartedAt!),
    );
  });

  it('hanya mengizinkan satu proses mengambil antrean yang sama', async () => {
    const db = await getOfflineDb();
    const action = makeAction();

    await db.put('pending_actions', action);

    const results = await Promise.all([
      claimOfflineActionForSync(action.clientUuid),
      claimOfflineActionForSync(action.clientUuid),
    ]);

    expect(
      results.filter((result) => result !== null),
    ).toHaveLength(1);

    const saved = await db.get(
      'pending_actions',
      action.clientUuid,
    );

    expect(saved?.status).toBe('syncing');
  });

  it('tidak otomatis mengklaim kegagalan permanen', async () => {
    const db = await getOfflineDb();

    const action = makeAction({
      status: 'failed',
      lastError: 'Kesalahan validasi',
      lastErrorRetryable: false,
    });

    await db.put('pending_actions', action);

    const automaticRetry = await claimOfflineActionForSync(
      action.clientUuid,
    );

    expect(automaticRetry).toBeNull();

    const manualRetry = await claimOfflineActionForSync(
      action.clientUuid,
      true,
    );

    expect(manualRetry?.status).toBe('syncing');
  });

  it('tidak mencoba ulang kegagalan sementara sebelum waktunya', async () => {
    const db = await getOfflineDb();

    const action = makeAction({
      status: 'failed',
      lastError: 'Network timeout',
      lastErrorRetryable: true,
      retryCount: 1,
      nextRetryAt: new Date(
        Date.now() + 60_000,
      ).toISOString(),
    });

    await db.put('pending_actions', action);

    const claimed = await claimOfflineActionForSync(
      action.clientUuid,
    );

    expect(claimed).toBeNull();

    const saved = await db.get(
      'pending_actions',
      action.clientUuid,
    );

    expect(saved?.status).toBe('failed');
  });

  it('mengizinkan retry otomatis setelah waktunya tiba', async () => {
    const db = await getOfflineDb();

    const action = makeAction({
      status: 'failed',
      lastError: 'Network timeout',
      lastErrorRetryable: true,
      retryCount: 1,
      nextRetryAt: new Date(
        Date.now() - 1_000,
      ).toISOString(),
    });

    await db.put('pending_actions', action);

    const claimed = await claimOfflineActionForSync(
      action.clientUuid,
    );

    expect(claimed?.status).toBe('syncing');
    expect(claimed?.nextRetryAt).toBeUndefined();
  });

  it('menyimpan jadwal retry bertahap untuk kegagalan sementara', async () => {
    const db = await getOfflineDb();

    const action = makeAction({
      status: 'syncing',
      retryCount: 0,
    });

    await db.put('pending_actions', action);

    const before = Date.now();

    await updateActionStatus(
      action.clientUuid,
      'failed',
      'Network timeout',
      true,
    );

    const saved = await db.get(
      'pending_actions',
      action.clientUuid,
    );

    const retryAt = Date.parse(
      saved?.nextRetryAt ?? '',
    );

    expect(saved?.status).toBe('failed');
    expect(saved?.lastErrorRetryable).toBe(true);
    expect(saved?.retryCount).toBe(1);
    expect(retryAt).toBeGreaterThanOrEqual(
      before + 29_000,
    );
    expect(retryAt).toBeLessThanOrEqual(
      before + 32_000,
    );
  });
});
