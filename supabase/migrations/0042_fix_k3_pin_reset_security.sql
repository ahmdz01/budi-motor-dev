-- ============================================================
-- 0042_fix_k3_pin_reset_security.sql
-- K3: Pengamanan reset PIN dan pencabutan sesi pengguna.
-- ============================================================

begin;

-- Penanda proses untuk mencegah dua admin memproses
-- permintaan reset PIN yang sama secara bersamaan.
alter table public.pin_reset_requests
  add column if not exists processing_started_at timestamptz;

alter table public.pin_reset_requests
  add column if not exists processing_by uuid
  references public.users(id);

comment on column public.pin_reset_requests.processing_started_at is
  'Waktu mulai pemrosesan reset PIN. Klaim kedaluwarsa setelah 15 menit.';

comment on column public.pin_reset_requests.processing_by is
  'User yang sedang memproses permintaan reset PIN.';


-- Cabut sesi tersimpan milik pengguna target.
-- Fungsi hanya boleh dipanggil lewat service_role.
create or replace function public.revoke_user_sessions(
  p_user_id uuid
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_deleted integer;
begin
  if p_user_id is null then
    raise exception 'ID pengguna tidak valid.';
  end if;

  delete from auth.sessions
  where user_id = p_user_id;

  get diagnostics v_deleted = row_count;

  return v_deleted;
end;
$$;

revoke all on function public.revoke_user_sessions(uuid)
  from public, anon, authenticated;

grant execute on function public.revoke_user_sessions(uuid)
  to service_role;

commit;