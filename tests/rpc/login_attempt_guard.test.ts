import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { createTestUser } from '../helpers/createTestUser';
import { createAnonClient, supabaseAdmin } from '../helpers/supabaseTestClients';

describe('login attempt reservation (K1)', () => {
  let user: Awaited<ReturnType<typeof createTestUser>>;

  beforeAll(async () => {
    user = await createTestUser({
      roleCode: 'kasir',
      name: 'Test Login Attempt Guard',
    });
  });

  afterAll(async () => {
    await user?.cleanup();
  });

  it('hanya mengizinkan satu login paralel untuk akun yang sama', async () => {
    const attemptIds = Array.from({ length: 8 }, () => randomUUID());
    const responses = await Promise.all(
      attemptIds.map((attemptId) =>
        supabaseAdmin.rpc('begin_login_attempt', {
          p_phone_number: user.phoneNumber,
          p_attempt_id: attemptId,
        })
      )
    );

    for (const response of responses) {
      expect(response.error).toBeNull();
    }

    const rows = responses.map((response) => response.data?.[0]);
    expect(rows.filter((row) => row?.can_proceed)).toHaveLength(1);
    expect(rows.filter((row) => row?.is_busy)).toHaveLength(7);

    const winnerIndex = rows.findIndex((row) => row?.can_proceed);
    const release = await supabaseAdmin.rpc('finish_login_attempt', {
      p_phone_number: user.phoneNumber,
      p_attempt_id: attemptIds[winnerIndex],
      p_outcome: 'aborted',
    });

    expect(release.error).toBeNull();
    expect(release.data?.[0]?.applied).toBe(true);
  });

  it('mengunci akun setelah lima PIN salah dan tidak menghitung hasil aborted', async () => {
    const networkAttemptId = randomUUID();
    const networkBegin = await supabaseAdmin.rpc('begin_login_attempt', {
      p_phone_number: user.phoneNumber,
      p_attempt_id: networkAttemptId,
    });

    expect(networkBegin.error).toBeNull();
    expect(networkBegin.data?.[0]?.can_proceed).toBe(true);

    const networkFinish = await supabaseAdmin.rpc('finish_login_attempt', {
      p_phone_number: user.phoneNumber,
      p_attempt_id: networkAttemptId,
      p_outcome: 'aborted',
    });

    expect(networkFinish.error).toBeNull();
    expect(networkFinish.data?.[0]?.failed_attempts).toBe(0);

    for (let attemptNumber = 1; attemptNumber <= 5; attemptNumber += 1) {
      const attemptId = randomUUID();
      const begin = await supabaseAdmin.rpc('begin_login_attempt', {
        p_phone_number: user.phoneNumber,
        p_attempt_id: attemptId,
      });

      expect(begin.error).toBeNull();
      expect(begin.data?.[0]?.can_proceed).toBe(true);

      const finish = await supabaseAdmin.rpc('finish_login_attempt', {
        p_phone_number: user.phoneNumber,
        p_attempt_id: attemptId,
        p_outcome: 'invalid_credentials',
      });

      expect(finish.error).toBeNull();
      expect(finish.data?.[0]?.applied).toBe(true);
      expect(finish.data?.[0]?.failed_attempts).toBe(attemptNumber);
    }

    const lockedAttempt = await supabaseAdmin.rpc('begin_login_attempt', {
      p_phone_number: user.phoneNumber,
      p_attempt_id: randomUUID(),
    });

    expect(lockedAttempt.error).toBeNull();
    expect(lockedAttempt.data?.[0]?.can_proceed).toBe(false);
    expect(lockedAttempt.data?.[0]?.is_locked).toBe(true);
    expect(lockedAttempt.data?.[0]?.locked_until).toBeTruthy();
  });

  it('menolak pemanggilan RPC reservasi dari anon dan authenticated', async () => {
    const attemptId = randomUUID();
    const anonClient = createAnonClient();

    const anonResult = await anonClient.rpc('begin_login_attempt', {
      p_phone_number: user.phoneNumber,
      p_attempt_id: attemptId,
    });

    expect(anonResult.error).not.toBeNull();

    const authenticatedResult = await user.client.rpc('begin_login_attempt', {
      p_phone_number: user.phoneNumber,
      p_attempt_id: randomUUID(),
    });

    expect(authenticatedResult.error).not.toBeNull();

    const anonFinishResult = await anonClient.rpc('finish_login_attempt', {
      p_phone_number: user.phoneNumber,
      p_attempt_id: attemptId,
      p_outcome: 'aborted',
    });

    expect(anonFinishResult.error).not.toBeNull();

    const authenticatedFinishResult = await user.client.rpc('finish_login_attempt', {
      p_phone_number: user.phoneNumber,
      p_attempt_id: attemptId,
      p_outcome: 'aborted',
    });

    expect(authenticatedFinishResult.error).not.toBeNull();
  });
});
