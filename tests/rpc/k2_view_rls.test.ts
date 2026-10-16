import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createTestUser } from '../helpers/createTestUser';
import { createAnonClient } from '../helpers/supabaseTestClients';

describe('K2: keamanan akses database view', () => {
  let cashier: Awaited<ReturnType<typeof createTestUser>>;

  beforeAll(async () => {
    cashier = await createTestUser({
      roleCode: 'kasir',
      name: 'Test K2 View RLS',
    });
  });

  afterAll(async () => {
    await cashier?.cleanup();
  });

  it('anon tidak dapat membaca data service_list_view', async () => {
    const anon = createAnonClient();

    const { data, error } = await anon
      .from('service_list_view')
      .select('id')
      .limit(1);

    expect(
      error !== null || (data?.length ?? 0) === 0,
    ).toBe(true);
  });

  it('anon tidak dapat membaca ledger_daily_summary', async () => {
    const anon = createAnonClient();

    const { data, error } = await anon
      .from('ledger_daily_summary')
      .select('*')
      .limit(1);

    expect(
      error !== null || (data?.length ?? 0) === 0,
    ).toBe(true);
  });

  it('kasir tidak dapat membaca ringkasan keuangan', async () => {
    const { data, error } = await cashier.client
      .from('ledger_daily_summary')
      .select('*')
      .limit(1);

    expect(
      error !== null || (data?.length ?? 0) === 0,
    ).toBe(true);
  });
});