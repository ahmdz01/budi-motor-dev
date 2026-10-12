-- ============================================================
-- 0040_add_pin_version.sql
-- Menandai versi format password PIN pada user.
--
-- 1 = legacy: <PIN>-bm
-- 2 = HMAC-SHA256(PIN_PEPPER, phone:PIN)
-- ============================================================

alter table public.users
add column if not exists pin_version smallint
not null default 1
check (pin_version in (1, 2));

comment on column public.users.pin_version is
  'Versi format password PIN: 1 = legacy, 2 = HMAC-SHA256 dengan PIN_PEPPER.';