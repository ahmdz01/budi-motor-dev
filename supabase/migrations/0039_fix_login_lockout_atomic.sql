-- ============================================================
-- 0039_fix_login_lockout_atomic.sql
--
-- K1: Perbaikan atomic login lockout
--
-- Tujuan:
-- 1. Lock row users saat memeriksa status login.
-- 2. Lock row users saat mencatat failed login.
-- 3. Lock row users saat reset login attempts.
-- 4. Membersihkan lock yang sudah kedaluwarsa.
-- 5. RPC security hanya dapat dipanggil service_role.
-- ============================================================


-- ============================================================
-- 1. CHECK LOGIN LOCKOUT
-- ============================================================

create or replace function public.check_login_lockout(
  p_phone_number varchar
)
returns table(
  is_locked boolean,
  locked_until timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_locked_until timestamptz;
begin
  -- Kunci row user selama transaksi RPC ini berlangsung.
  select u.locked_until
  into v_locked_until
  from public.users u
  where u.phone_number = p_phone_number
  for update;

  -- Tidak ditemukan user.
  if not found then
    return;
  end if;

  -- Jika lock sudah kedaluwarsa, bersihkan state lock.
  if v_locked_until is not null
     and v_locked_until <= now() then

    update public.users
    set
      failed_login_attempts = 0,
      locked_until = null
    where phone_number = p_phone_number;

    return query
    select
      false,
      null::timestamptz;

    return;
  end if;

  -- Jika masih terkunci atau belum pernah terkunci.
  return query
  select
    (
      v_locked_until is not null
      and v_locked_until > now()
    ),
    v_locked_until;
end;
$$;


-- ============================================================
-- 2. RECORD FAILED LOGIN
-- ============================================================

create or replace function public.record_failed_login(
  p_phone_number varchar
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_attempts smallint;
begin
  -- Lock row user terlebih dahulu agar dua request
  -- gagal secara bersamaan tidak kehilangan increment.
  select u.failed_login_attempts
  into v_attempts
  from public.users u
  where u.phone_number = p_phone_number
  for update;

  -- Jangan melakukan apa pun jika user tidak ditemukan.
  if not found then
    return;
  end if;

  -- Tambahkan satu percobaan, maksimum 5.
  v_attempts := least(v_attempts + 1, 5);

  update public.users
  set
    failed_login_attempts = v_attempts,
    locked_until = case
      when v_attempts >= 5
        then now() + interval '15 minutes'
      else locked_until
    end
  where phone_number = p_phone_number;
end;
$$;


-- ============================================================
-- 3. RESET LOGIN ATTEMPTS
-- ============================================================

create or replace function public.reset_login_attempts(
  p_phone_number varchar
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- UPDATE sendiri sudah mengambil row-level lock.
  update public.users
  set
    failed_login_attempts = 0,
    locked_until = null,
    last_login_at = now()
  where phone_number = p_phone_number;
end;
$$;


-- ============================================================
-- 4. PASTIKAN PERMISSION AMAN
-- ============================================================

revoke execute
on function public.check_login_lockout(varchar)
from public, anon, authenticated;

revoke execute
on function public.record_failed_login(varchar)
from public, anon, authenticated;

revoke execute
on function public.reset_login_attempts(varchar)
from public, anon, authenticated;


grant execute
on function public.check_login_lockout(varchar)
to service_role;

grant execute
on function public.record_failed_login(varchar)
to service_role;

grant execute
on function public.reset_login_attempts(varchar)
to service_role;