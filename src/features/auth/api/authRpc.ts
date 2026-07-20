import type { SupabaseClient } from '@supabase/supabase-js';
import { callRpc } from '@/shared/lib/supabase/rpc';
import type { Result } from '@/shared/types/result';

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
  phoneNumber: string
): Promise<Result<null>> {
  return callRpc<{ p_phone_number: string }, null>(supabase, 'request_pin_reset', {
    p_phone_number: phoneNumber,
  });
}
