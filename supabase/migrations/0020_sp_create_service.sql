-- ============================================================
-- 0020_sp_create_service.sql
-- Langkah 7.1 — Terima Kendaraan Servis (Intake).
--
-- service_list_view: pola sama seperti product_list_view (0011) —
-- gabungan services + customers + vehicles untuk daftar. SENGAJA
-- TIDAK join ke public.users untuk data mekanik di langkah ini,
-- karena RLS public.users cuma izinkan baca data sendiri + Owner/
-- Admin/Super Admin baca semua (lihat 0001_auth_foundation.sql).
-- Kasir/Mekanik yang membuka daftar servis akan dapat NULL untuk
-- nama mekanik lain kalau kita paksa join sekarang. Karena mekanik
-- belum di-assign di tahap intake ini (mechanic_id selalu null saat
-- servis baru dibuat), join itu ditunda ke langkah yang memang
-- butuh assign mekanik (Langkah 7.2+) — akan diputuskan di situ:
-- perluas RLS public.users, atau baca via RPC SECURITY DEFINER
-- terpisah (get_services_list) mengikuti pola get_dashboard_metrics.
--
-- sp_create_service: RPC SECURITY DEFINER (aturan tabel finansial
-- inti dari awal project — services wajib lewat RPC, tidak boleh
-- INSERT langsung dari client). Idempotency via client_uuid, pola
-- identik dengan sp_create_pos_transaction (0019).
-- ============================================================

create view public.service_list_view as
select
  s.id,
  s.status,
  s.complaint,
  s.customer_type_used,
  s.is_warranty_claim,
  s.mechanic_id,
  s.created_at,
  s.customer_id,
  c.name as customer_name,
  c.phone_number as customer_phone,
  s.vehicle_id,
  v.police_plate,
  v.motor_brand,
  v.motor_model
from public.services s
join public.customers c on c.id = s.customer_id
left join public.vehicles v on v.id = s.vehicle_id;

create or replace function public.sp_create_service(
  p_client_uuid uuid,
  p_customer_id uuid,
  p_vehicle_id uuid,
  p_complaint varchar(500),
  p_customer_type_used varchar(20) default 'service',
  p_is_warranty_claim boolean default false
)
returns table (service_id uuid)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
  v_user_id uuid;
  v_service_id uuid;
  v_vehicle_owner uuid;
begin
  v_role := auth.jwt() -> 'app_metadata' ->> 'role_code';
  if v_role is null or v_role not in ('owner', 'admin', 'kasir', 'super_admin') then
    raise exception 'Akses ditolak: hanya Owner/Admin/Kasir/Super Admin yang boleh menerima kendaraan servis.'
      using errcode = '42501';
  end if;

  v_user_id := auth.uid();

  -- IDEMPOTENCY CHECK — pola sama dengan sp_create_pos_transaction.
  select id into v_service_id
  from public.services
  where client_uuid = p_client_uuid;

  if found then
    return query select v_service_id;
    return;
  end if;

  if p_customer_id is null then
    raise exception 'Pelanggan wajib dipilih.' using errcode = '22023';
  end if;

  if p_complaint is null or length(trim(p_complaint)) < 3 then
    raise exception 'Keluhan wajib diisi (minimal 3 karakter).' using errcode = '22023';
  end if;

  if p_customer_type_used not in ('general', 'service', 'workshop') then
    raise exception 'Tipe pelanggan tidak valid.' using errcode = '22023';
  end if;

  -- Kalau kendaraan disertakan, pastikan benar milik pelanggan yang
  -- sama — mencegah salah pasang data akibat bug di client atau
  -- manipulasi panggilan RPC langsung.
  if p_vehicle_id is not null then
    select customer_id into v_vehicle_owner
    from public.vehicles
    where id = p_vehicle_id;

    if v_vehicle_owner is null then
      raise exception 'Kendaraan tidak ditemukan.' using errcode = '22023';
    end if;

    if v_vehicle_owner <> p_customer_id then
      raise exception 'Kendaraan tidak terdaftar atas nama pelanggan ini.' using errcode = '22023';
    end if;
  end if;

  insert into public.services (
    client_uuid, customer_id, vehicle_id, complaint,
    customer_type_used, status, is_warranty_claim, created_by
  ) values (
    p_client_uuid, p_customer_id, p_vehicle_id, trim(p_complaint),
    p_customer_type_used, 'waiting', p_is_warranty_claim, v_user_id
  )
  returning id into v_service_id;

  insert into public.service_status_history (
    service_id, status_from, status_to, changed_by, reason
  ) values (
    v_service_id, null, 'waiting', v_user_id, 'Kendaraan diterima'
  );

  return query select v_service_id;
end;
$$;

grant execute on function public.sp_create_service(uuid, uuid, uuid, varchar, varchar, boolean) to authenticated;