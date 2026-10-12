
import { randomUUID } from 'node:crypto';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

vi.mock('@/shared/lib/supabase/client', () => ({
  createClient: vi.fn(() => ({})),
}));

vi.mock('@/shared/lib/supabase/rpc', () => ({
  callRpc: vi.fn(),
}));

import { callRpc } from '@/shared/lib/supabase/rpc';
import {
  enqueueOfflineAction,
  getPendingActions,
  removeOfflineAction,
  updateActionStatus,
} from '@/shared/lib/offline/queue';
import { getOfflineDb } from '@/shared/lib/offline/db';
import { syncPosTransactions } from '@/features/pos/lib/syncPosTransactions';

const createdIds = new Set<string>();

const payload = {
  p_customer_id: null,
  p_customer_type_used: 'general',
  p_items: [{ product_id: 'test-product', qty: 1 }],
  p_payment_method: 'cash',
  p_amount_received: 50_000,
};

async function addFailedAction(): Promise<string> {
  const clientUuid = randomUUID();
  createdIds.add(clientUuid);

  await enqueueOfflineAction(
    'pos_transaction',
    payload,
    clientUuid,
  );

  await updateActionStatus(
    clientUuid,
    'failed',
    'Network timeout',
    true,
  );

  return clientUuid;
}

function mockSuccessfulRpc() {
  vi.mocked(callRpc).mockResolvedValue({
    success: true,
    data: [
      {
        transaction_id: randomUUID(),
        total_amount: 50_000,
        change_amount: 0,
      },
    ],
  } as never);
}

describe('syncPosTransactions — retry T2', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(async () => {
    await Promise.all(
      [...createdIds].map((id) => removeOfflineAction(id)),
    );

    createdIds.clear();
  });

  it('retry manual hanya memproses transaksi yang dipilih', async () => {
    const selectedUuid = await addFailedAction();
    const otherUuid = await addFailedAction();

    mockSuccessfulRpc();

    const result = await syncPosTransactions(selectedUuid);

    expect(result.synced).toBe(1);
    expect(result.failed).toBe(0);
    expect(callRpc).toHaveBeenCalledTimes(1);

    const rpcArgs = vi.mocked(callRpc).mock.calls[0]?.[2];

    expect(rpcArgs).toMatchObject({
      p_client_uuid: selectedUuid,
    });

    const remainingActions = await getPendingActions();

    expect(
      remainingActions.some(
        (action) => action.clientUuid === selectedUuid,
      ),
    ).toBe(false);

    expect(
      remainingActions.find(
        (action) => action.clientUuid === otherUuid,
      )?.status,
    ).toBe('failed');
  });

  it('retry otomatis tidak mengirim transaksi sebelum waktunya', async () => {
    const clientUuid = await addFailedAction();

    mockSuccessfulRpc();

    const result = await syncPosTransactions();

    expect(result.synced).toBe(0);
    expect(callRpc).not.toHaveBeenCalled();

    const actions = await getPendingActions();
    const saved = actions.find(
      (action) => action.clientUuid === clientUuid,
    );

    expect(saved?.status).toBe('failed');
  });

  it('retry otomatis mengirim transaksi setelah waktunya tiba', async () => {
    const clientUuid = await addFailedAction();
    const db = await getOfflineDb();

    const action = await db.get(
      'pending_actions',
      clientUuid,
    );

    expect(action).toBeDefined();

    await db.put('pending_actions', {
      ...action!,
      nextRetryAt: new Date(Date.now() - 1_000).toISOString(),
    });

    mockSuccessfulRpc();

    const result = await syncPosTransactions();

    expect(result.synced).toBe(1);
    expect(result.failed).toBe(0);
    expect(callRpc).toHaveBeenCalledTimes(1);

    const remainingActions = await getPendingActions();

    expect(
      remainingActions.some(
        (item) => item.clientUuid === clientUuid,
      ),
    ).toBe(false);
  });
});
