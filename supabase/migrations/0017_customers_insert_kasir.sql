-- ============================================================
-- 0017_customers_insert_kasir.sql
-- Expand RLS insert Customers ke role Kasir — sesuai keputusan
-- Langkah 6.1: Kasir perlu bisa mendaftarkan pelanggan baru
-- langsung saat transaksi POS, tanpa harus lewat Admin dulu.
-- (Catatan ini yang dimaksud di komentar migrasi 0012 — "menyusul
-- di Phase 6".) Vehicles TIDAK ikut di-expand di sini — itu
-- kebutuhan Phase 7/Service, dibahas terpisah nanti.
-- ============================================================

drop policy if exists "customers_insert_admin" on public.customers;

create policy "customers_insert_staff" on public.customers
  for insert with check (
    (auth.jwt() -> 'app_metadata' ->> 'role_code') in ('owner', 'admin', 'super_admin', 'kasir')
  );