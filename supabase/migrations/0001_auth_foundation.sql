-- ============================================================
-- 0001_auth_foundation.sql
-- Tabel roles, users, RLS, dan RPC untuk rate limiting login.
-- Sesuai Data Dictionary v3 (revisi: pin_hash dihapus, memakai
-- Supabase Auth bawaan untuk penyimpanan kredensial PIN).
-- ============================================================

-- ---------- ROLES ----------
create table public.roles (
  code varchar(20) primary key,
  display_name varchar(50) not null,
  description text
);

insert into public.roles (code, display_name, description) values
  ('owner', 'Owner', 'Pemilik bengkel, akses penuh'),
  ('admin', 'Admin', 'Mengelola barang, servis, laporan'),
  ('kasir', 'Kasir', 'Transaksi POS dan servis'),
  ('mekanik', 'Mekanik', 'Update status pengerjaan servis'),
  ('super_admin', 'Super Admin', 'Developer, akses penuh + konfigurasi sistem');

-- ---------- USERS ----------
-- id = auth.uid() milik Supabase Auth (bukan UUID independen)
create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  phone_number varchar(20) not null unique,
  name varchar(100) not null,
  role_code varchar(20) not null references public.roles(code),
  status varchar(20) not null default 'active'
    check (status in ('active','inactive')),
  failed_login_attempts smallint not null default 0
    check (failed_login_attempts between 0 and 5),
  locked_until timestamptz,
  last_login_at timestamptz,
  last_device_label varchar(50),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.users enable row level security;

-- User boleh baca datanya sendiri
create policy "users_select_own" on public.users
  for select using (auth.uid() = id);

-- Owner/Admin/Super Admin boleh baca semua user
create policy "users_select_admin" on public.users
  for select using (
    (auth.jwt() -> 'app_metadata' ->> 'role_code') in ('owner','admin','super_admin')
  );

-- Trigger auto-update updated_at (dipakai ulang di seluruh tabel lain nanti)
create or replace function public.trg_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_updated_at
  before update on public.users
  for each row execute function public.trg_set_updated_at();

-- ============================================================
-- RPC: Rate Limiting & Lockout Login
-- Dipanggil SEBELUM user terautentikasi (masih anonymous),
-- karena itu diberi akses ke role 'anon'. Setiap function
-- HANYA menyentuh kolom failed_login_attempts/locked_until,
-- tidak ada akses ke data lain — aman diberi ke anon.
-- ============================================================

create or replace function public.check_login_lockout(p_phone_number varchar)
returns table(is_locked boolean, locked_until timestamptz)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  select
    (u.locked_until is not null and u.locked_until > now()),
    u.locked_until
  from public.users u
  where u.phone_number = p_phone_number;
end;
$$;

grant execute on function public.check_login_lockout(varchar) to anon, authenticated;

create or replace function public.record_failed_login(p_phone_number varchar)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_attempts smallint;
begin
  update public.users
  set failed_login_attempts = least(failed_login_attempts + 1, 5)
  where phone_number = p_phone_number
  returning failed_login_attempts into v_attempts;

  if v_attempts >= 5 then
    update public.users
    set locked_until = now() + interval '15 minutes'
    where phone_number = p_phone_number;
  end if;
end;
$$;

grant execute on function public.record_failed_login(varchar) to anon, authenticated;

create or replace function public.reset_login_attempts(p_phone_number varchar)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.users
  set failed_login_attempts = 0,
      locked_until = null,
      last_login_at = now()
  where phone_number = p_phone_number;
end;
$$;

grant execute on function public.reset_login_attempts(varchar) to anon, authenticated;