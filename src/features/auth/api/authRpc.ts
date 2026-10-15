import type { SupabaseClient } from '@supabase/supabase-js';
import { callRpc } from '@/shared/lib/supabase/rpc';
import type { Result } from '@/shared/types/result';

interface BeginLoginAttemptStatus {
  can_proceed: boolean;
  is_locked: boolean;
  locked_until: string | null;
  is_busy: boolean;
}

interface FinishLoginAttemptStatus {
  applied: boolean;
  failed_attempts: number | null;
  locked_until: string | null;
}

export type LoginAttemptOutcome = 'success' | 'invalid_credentials' | 'aborted';

/** Reservasi atomik supaya hanya satu proses login per akun yang berjalan. */
export async function beginLoginAttempt(
  supabase: SupabaseClient,
  phoneNumber: string,
  attemptId: string
): Promise<Result<BeginLoginAttemptStatus[]>> {
  return callRpc<{ p_phone_number: string; p_attempt_id: string }, BeginLoginAttemptStatus[]>(
    supabase,
    'begin_login_attempt',
    {
      p_phone_number: phoneNumber,
      p_attempt_id: attemptId,
    }
  );
}

/** Selesaikan reservasi login tanpa menghitung error jaringan sebagai PIN salah. */
export async function finishLoginAttempt(
  supabase: SupabaseClient,
  phoneNumber: string,
  attemptId: string,
  outcome: LoginAttemptOutcome
): Promise<Result<FinishLoginAttemptStatus[]>> {
  return callRpc<
    {
      p_phone_number: string;
      p_attempt_id: string;
      p_outcome: LoginAttemptOutcome;
    },
    FinishLoginAttemptStatus[]
  >(supabase, 'finish_login_attempt', {
    p_phone_number: phoneNumber,
    p_attempt_id: attemptId,
    p_outcome: outcome,
  });
}

interface LockoutStatus {
  is_locked: boolean;
  locked_until: string | null;
}

export async function checkLoginLockout(
  supabase: SupabaseClient,
  phoneNumber: string
): Promise<Result<LockoutStatus[]>> {
  return callRpc<{ p_phone_number: string }, LockoutStatus[]>(supabase, 'check_login_lockout', {
    p_phone_number: phoneNumber,
  });
}

export async function recordFailedLogin(
  supabase: SupabaseClient,
  phoneNumber: string
): Promise<Result<null>> {
  return callRpc<{ p_phone_number: string }, null>(supabase, 'record_failed_login', {
    p_phone_number: phoneNumber,
  });
}

export async function resetLoginAttempts(
  supabase: SupabaseClient,
  phoneNumber: string
): Promise<Result<null>> {
  return callRpc<{ p_phone_number: string }, null>(supabase, 'reset_login_attempts', {
    p_phone_number: phoneNumber,
  });
}

export async function requestPinReset(
  supabase: SupabaseClient,
  phoneNumber: string,
  ipHash: string
): Promise<Result<null>> {
  return callRpc<{ p_phone_number: string; p_ip_hash: string }, null>(
    supabase,
    'request_pin_reset',
    {
      p_phone_number: phoneNumber,
      p_ip_hash: ipHash,
    }
  );
}
