-- ============================================================
-- 0002_pin_reset_requests.sql
-- Tabel permintaan reset PIN (alur manual, sesuai Business Rules
-- halaman Lupa Password — bukan OTP/email otomatis).
-- Penanganan (approve/reset PIN oleh Owner/Super Admin) dibangun
-- di Phase 11 (Settings/Pengguna). Untuk sekarang, permintaan
-- tersimpan dan dapat dibaca admin, belum ada tombol aksi di UI.
-- ============================================================

create table public.pin_reset_requests (
  id uuid primary key default gen_random_uuid(),
  phone_number varchar(20) not null,
  status varchar(20) not null default 'pending'
    check (status in ('pending', 'resolved')),
  requested_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references public.users(id)
);

alter table public.pin_reset_requests enable row level security;

-- Hanya Owner/Admin/Super Admin yang boleh membaca daftar permintaan
create policy "pin_reset_requests_select_admin" on public.pin_reset_requests
  for select using (
    (auth.jwt() -> 'app_metadata' ->> 'role_code') in ('owner','admin','super_admin')
  );

-- TIDAK ADA policy insert/update untuk anon/authenticated —
-- seluruh mutasi HANYA lewat RPC di bawah (konsisten dengan
-- prinsip privilege model Data Dictionary v3).

create or replace function public.request_pin_reset(p_phone_number varchar)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Cegah spam: jangan buat permintaan baru jika sudah ada
  -- yang masih pending untuk nomor yang sama.
  if not exists (
    select 1 from public.pin_reset_requests
    where phone_number = p_phone_number and status = 'pending'
  ) then
    insert into public.pin_reset_requests (phone_number)
    values (p_phone_number);
  end if;
end;
$$;

grant execute on function public.request_pin_reset(varchar) to anon, authenticated;