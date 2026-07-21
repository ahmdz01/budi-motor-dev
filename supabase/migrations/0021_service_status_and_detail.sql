-- ============================================================
-- 0021_service_status_and_detail.sql
-- Langkah 7.2 — Halaman Detail Servis, Assign Mekanik & Ubah Status.
--
-- get_active_mechanics, get_service_detail, get_service_status_history:
-- SECURITY DEFINER dengan cek role eksplisit, pola sama seperti
-- get_dashboard_metrics (Phase 3) — dibutuhkan karena RLS public.users
-- (0001_auth_foundation.sql) cuma izinkan baca data sendiri atau
-- Owner/Admin/Super Admin baca semua; Kasir & Mekanik butuh melihat
-- nama user lain (mekanik yang di-assign, pembuat servis) di halaman
-- ini. RLS users TIDAK diubah — cukup dilewati lewat RPC ini,
-- konsisten dengan keputusan awal.
--
-- sp_change_service_status: state machine. Status 'pending_approval'
-- dan 'paid' SENGAJA tidak bisa di-set lewat RPC ini — keduanya
-- hasil otomatis dari sp_send_service_estimate (7.4) dan
-- sp_confirm_service_payment (7.5).
-- ============================================================

create or replace function public.get_active_mechanics()
returns table (id uuid, name varchar)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
begin
  v_role := auth.jwt() -> 'app_metadata' ->> 'role_code';
  if v_role is null or v_role not in ('owner', 'admin', 'kasir', 'super_admin') then
    raise exception 'Akses ditolak.' using errcode = '42501';
  end if;

  return query
    select u.id, u.name
    from public.users u
    where u.role_code = 'mekanik' and u.status = 'active'
    order by u.name;
end;
$$;

grant execute on function public.get_active_mechanics() to authenticated;

create or replace function public.get_service_detail(p_service_id uuid)
returns table (
  id uuid,
  status varchar,
  complaint varchar,
  customer_type_used varchar,
  is_warranty_claim boolean,
  created_at timestamptz,
  customer_id uuid,
  customer_name varchar,
  customer_phone varchar,
  vehicle_id uuid,
  police_plate varchar,
  motor_brand varchar,
  motor_model varchar,
  mechanic_id uuid,
  mechanic_name varchar,
  created_by_name varchar
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
begin
  v_role := auth.jwt() -> 'app_metadata' ->> 'role_code';
  if v_role is null or v_role not in ('owner', 'admin', 'kasir', 'mekanik', 'super_admin') then
    raise exception 'Akses ditolak.' using errcode = '42501';
  end if;

  return query
    select
      s.id, s.status, s.complaint, s.customer_type_used, s.is_warranty_claim, s.created_at,
      s.customer_id, c.name, c.phone_number,
      s.vehicle_id, v.police_plate, v.motor_brand, v.motor_model,
      s.mechanic_id, m.name,
      cb.name
    from public.services s
    join public.customers c on c.id = s.customer_id
    left join public.vehicles v on v.id = s.vehicle_id
    left join public.users m on m.id = s.mechanic_id
    join public.users cb on cb.id = s.created_by
    where s.id = p_service_id;
end;
$$;

grant execute on function public.get_service_detail(uuid) to authenticated;

create or replace function public.get_service_status_history(p_service_id uuid)
returns table (
  status_from varchar,
  status_to varchar,
  reason varchar,
  created_at timestamptz,
  changed_by_name varchar
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
begin
  v_role := auth.jwt() -> 'app_metadata' ->> 'role_code';
  if v_role is null or v_role not in ('owner', 'admin', 'kasir', 'mekanik', 'super_admin') then
    raise exception 'Akses ditolak.' using errcode = '42501';
  end if;

  return query
    select h.status_from, h.status_to, h.reason, h.created_at, u.name
    from public.service_status_history h
    join public.users u on u.id = h.changed_by
    where h.service_id = p_service_id
    order by h.created_at asc;
end;
$$;

grant execute on function public.get_service_status_history(uuid) to authenticated;

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
      select 1 from public.users
      where id = p_mechanic_id and role_code = 'mekanik' and status = 'active'
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