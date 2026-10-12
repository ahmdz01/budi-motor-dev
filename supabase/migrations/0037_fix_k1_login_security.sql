-- ============================================================
-- K1: Fix login brute-force / anonymous RPC access
-- ============================================================

-- Hapus akses RPC dari anonymous/authenticated.
revoke execute
on function public.check_login_lockout(varchar)
from public, anon, authenticated;

revoke execute
on function public.record_failed_login(varchar)
from public, anon, authenticated;

revoke execute
on function public.reset_login_attempts(varchar)
from public, anon, authenticated;

-- Hanya service_role yang boleh menjalankan RPC ini.
grant execute
on function public.check_login_lockout(varchar)
to service_role;

grant execute
on function public.record_failed_login(varchar)
to service_role;

grant execute
on function public.reset_login_attempts(varchar)
to service_role;