-- ============================================================
-- K1: Fix login RPC permissions
-- Anonymous/authenticated users must not be able to
-- directly manipulate login lockout state.
-- ============================================================

REVOKE EXECUTE
ON FUNCTION public.check_login_lockout(varchar)
FROM public, anon, authenticated;

REVOKE EXECUTE
ON FUNCTION public.record_failed_login(varchar)
FROM public, anon, authenticated;

REVOKE EXECUTE
ON FUNCTION public.reset_login_attempts(varchar)
FROM public, anon, authenticated;

GRANT EXECUTE
ON FUNCTION public.check_login_lockout(varchar)
TO service_role;

GRANT EXECUTE
ON FUNCTION public.record_failed_login(varchar)
TO service_role;

GRANT EXECUTE
ON FUNCTION public.reset_login_attempts(varchar)
TO service_role;