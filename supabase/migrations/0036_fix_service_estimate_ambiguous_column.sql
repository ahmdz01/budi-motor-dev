-- ============================================================
-- 0036_fix_service_estimate_ambiguous_column.sql
-- PERBAIKAN BUG: sp_send_service_estimate dan sp_approve_service_
-- estimate (migrasi 0023) sama-sama punya RETURNS TABLE (status
-- varchar) — nama "status" jadi OUT parameter implisit di seluruh
-- badan function. Query pengecekan status servis saat ini menyebut
-- kolom "status" TANPA alias tabel, jadi ambigu dengan OUT parameter
-- itu (Kelas Bug #1 — kelas sama seperti total_amount di 0019 dan
-- status di sp_change_service_status sebelum diperbaiki 0033).
--
-- Terkonfirmasi lewat integration test (tests/rpc/sp_send_service_
-- estimate.test.ts dan sp_approve_service_estimate.test.ts):
-- error code 42702 "column reference status is ambiguous" di kedua
-- function, persis di baris "select status into v_current_status
-- from public.services where id = p_service_id".
--
-- FIX: qualify SEMUA referensi kolom "status" dengan alias tabel
-- (s.status), badan function lain TIDAK diubah sama sekali.
-- ============================================================

create or replace function public.sp_send_service_estimate(
  p_service_id uuid,
  p_notes varchar default null
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
  v_total numeric;
begin
  v_role := auth.jwt() -> 'app_metadata' ->> 'role_code';
  v_user_id := auth.uid();

  if v_role is null or v_role not in ('owner', 'admin', 'kasir', 'super_admin') then
    raise exception 'Akses ditolak: hanya Owner/Admin/Kasir/Super Admin yang boleh mengirim estimasi.'
      using errcode = '42501';
  end if;

  select s.status into v_current_status
  from public.services s
  where s.id = p_service_id
  for update;

  if not found then
    raise exception 'Servis tidak ditemukan.' using errcode = '22023';
  end if;

  if v_current_status <> 'in_progress' then
    raise exception 'Estimasi hanya bisa dikirim saat servis berstatus Dikerjakan.'
      using errcode = '22023';
  end if;

  select coalesce(sum(subtotal), 0) into v_total
  from public.service_items
  where service_id = p_service_id;

  if v_total <= 0 then
    raise exception 'Tambahkan minimal 1 item sebelum mengirim estimasi.' using errcode = '22023';
  end if;

  update public.services set status = 'pending_approval' where id = p_service_id;

  insert into public.service_status_history (service_id, status_from, status_to, changed_by, reason)
  values (
    p_service_id, 'in_progress', 'pending_approval', v_user_id,
    'Estimasi Rp' || to_char(round(v_total), 'FM999999999') || ' dikirim ke pelanggan.'
      || case when p_notes is not null and length(trim(p_notes)) > 0 then ' ' || trim(p_notes) else '' end
  );

  return query select 'pending_approval'::varchar;
end;
$$;

grant execute on function public.sp_send_service_estimate(uuid, varchar) to authenticated;

create or replace function public.sp_approve_service_estimate(
  p_service_id uuid,
  p_approved boolean,
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
  v_note text;
begin
  v_role := auth.jwt() -> 'app_metadata' ->> 'role_code';
  v_user_id := auth.uid();

  if v_role is null or v_role not in ('owner', 'admin', 'kasir', 'super_admin') then
    raise exception 'Akses ditolak: hanya Owner/Admin/Kasir/Super Admin yang boleh mencatat keputusan pelanggan.'
      using errcode = '42501';
  end if;

  select s.status into v_current_status
  from public.services s
  where s.id = p_service_id
  for update;

  if not found then
    raise exception 'Servis tidak ditemukan.' using errcode = '22023';
  end if;

  if v_current_status <> 'pending_approval' then
    raise exception 'Servis ini tidak sedang menunggu persetujuan.' using errcode = '22023';
  end if;

  v_note := case
    when p_approved then 'Pelanggan menyetujui estimasi.'
    else 'Pelanggan menolak estimasi.'
  end;

  if p_reason is not null and length(trim(p_reason)) > 0 then
    v_note := v_note || ' ' || trim(p_reason);
  end if;

  update public.services set status = 'in_progress' where id = p_service_id;

  insert into public.service_status_history (service_id, status_from, status_to, changed_by, reason)
  values (p_service_id, 'pending_approval', 'in_progress', v_user_id, v_note);

  return query select 'in_progress'::varchar;
end;
$$;

grant execute on function public.sp_approve_service_estimate(uuid, boolean, varchar) to authenticated;