-- ============================================================
-- 0033_fix_change_service_status_ambiguous_column.sql
-- PERBAIKAN BUG: sp_change_service_status punya RETURNS TABLE
-- (status varchar) — nama "status" jadi OUT parameter implisit
-- di seluruh badan function. Query pengecekan mekanik valid
-- menyebut kolom "status" TANPA alias tabel, jadi ambigu dengan
-- OUT parameter itu (kelas bug sama seperti "total_amount" di
-- sp_create_pos_transaction, migrasi 0019).
--
-- Kemungkinan besar bug ini SUDAH ADA sejak awal function ini
-- dibuat — ketahuan sekarang lewat integration test karena alur
-- "assign mekanik" belum pernah benar-benar dipakai di production.
-- ============================================================

create or replace function public.sp_change_service_status(
  p_service_id uuid,
  p_new_status varchar,
  p_mechanic_id uuid default null,
  p_reason varchar default null
)
returns table (status varchar)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
  v_user_id uuid;
  v_current_status varchar;
  v_current_mechanic uuid;
begin
  v_role := auth.jwt() -> 'app_metadata' ->> 'role_code';
  v_user_id := auth.uid();

  if v_role is null then
    raise exception 'Akses ditolak.' using errcode = '42501';
  end if;

  select s.status, s.mechanic_id into v_current_status, v_current_mechanic
  from public.services s
  where s.id = p_service_id
  for update;

  if not found then
    raise exception 'Servis tidak ditemukan.' using errcode = '22023';
  end if;

  if v_current_status = 'waiting' and p_new_status = 'in_progress' then
    if v_role not in ('owner', 'admin', 'kasir', 'super_admin') then
      raise exception 'Akses ditolak: hanya Owner/Admin/Kasir/Super Admin yang boleh menugaskan mekanik.'
        using errcode = '42501';
    end if;

    if p_mechanic_id is null then
      raise exception 'Mekanik wajib dipilih.' using errcode = '22023';
    end if;

    if not exists (
      select 1 from public.users u
      where u.id = p_mechanic_id and u.role_code = 'mekanik' and u.status = 'active'
    ) then
      raise exception 'Mekanik tidak valid.' using errcode = '22023';
    end if;

    update public.services set status = 'in_progress', mechanic_id = p_mechanic_id
    where id = p_service_id;

  elsif v_current_status = 'in_progress' and p_new_status = 'completed' then
    if not (
      v_role in ('owner', 'admin', 'super_admin')
      or (v_role = 'mekanik' and v_current_mechanic = v_user_id)
    ) then
      raise exception 'Akses ditolak: hanya mekanik yang ditugaskan atau Owner/Admin/Super Admin yang boleh menyelesaikan servis ini.'
        using errcode = '42501';
    end if;

    update public.services set status = 'completed' where id = p_service_id;

  elsif p_new_status = 'cancelled' and v_current_status in ('waiting', 'in_progress', 'pending_approval') then
    if v_role not in ('owner', 'admin', 'super_admin') then
      raise exception 'Akses ditolak: hanya Owner/Admin/Super Admin yang boleh membatalkan servis.'
        using errcode = '42501';
    end if;

    if p_reason is null or length(trim(p_reason)) < 3 then
      raise exception 'Alasan pembatalan wajib diisi (minimal 3 karakter).' using errcode = '22023';
    end if;

    update public.services set status = 'cancelled' where id = p_service_id;

  else
    raise exception 'Transisi status dari % ke % tidak diizinkan.', v_current_status, p_new_status
      using errcode = '22023';
  end if;

  insert into public.service_status_history (service_id, status_from, status_to, changed_by, reason)
  values (p_service_id, v_current_status, p_new_status, v_user_id, p_reason);

  return query select p_new_status;
end;
$$;

grant execute on function public.sp_change_service_status(uuid, varchar, uuid, varchar) to authenticated;