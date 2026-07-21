-- ============================================================
-- 0023_service_estimate.sql
-- Langkah 7.4 — Estimasi Servis.
--
-- Skema TIDAK punya tabel/kolom estimasi khusus (28 tabel sudah
-- dikunci sejak Phase 3), jadi "estimasi" = total service_items
-- yang sudah ada saat ini, dikirim sebagai status pending_approval
-- + catatan di service_status_history.
--
-- KEPUTUSAN (disetujui pengguna): approve maupun reject SAMA-SAMA
-- kembali ke 'in_progress' — skema tidak membedakan item lama vs
-- usulan baru, jadi menolak tidak menghapus item yang sudah
-- tercatat. Beda hanya di teks reason. Pembatalan total tetap
-- lewat sp_change_service_status yang sudah ada, terpisah dari
-- alur ini.
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

  select status into v_current_status
  from public.services
  where id = p_service_id
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

  select status into v_current_status
  from public.services
  where id = p_service_id
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