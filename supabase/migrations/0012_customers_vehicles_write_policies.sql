-- ============================================================
-- 0012_customers_vehicles_write_policies.sql
-- RLS INSERT/UPDATE untuk Customers & Vehicles — dibatasi role
-- Admin/Owner/Super Admin (pola sama dengan Products, Langkah 4.2).
--
-- CATATAN PENTING (keputusan Langkah 4.4): Kasir dan Mekanik BELUM
-- diberi hak insert di sini, walau di roadmap Phase 6 (POS) dan
-- Phase 7 (Service) mereka akan perlu mendaftarkan customer/vehicle
-- baru saat transaksi. Sengaja ditunda sampai form quick-add di
-- POS/Service benar-benar dibangun (YAGNI + least privilege — jangan
-- buka hak akses sebelum ada fitur konkret yang memakainya). Saat
-- Phase 6/7 dikerjakan, migrasi baru akan menambah role kasir/mekanik
-- ke policy ini.
-- ============================================================

create policy "customers_insert_admin" on public.customers
  for insert with check (
    (auth.jwt() -> 'app_metadata' ->> 'role_code') in ('owner','admin','super_admin')
  );

create policy "customers_update_admin" on public.customers
  for update using (
    (auth.jwt() -> 'app_metadata' ->> 'role_code') in ('owner','admin','super_admin')
  );

create policy "vehicles_insert_admin" on public.vehicles
  for insert with check (
    (auth.jwt() -> 'app_metadata' ->> 'role_code') in ('owner','admin','super_admin')
  );

create policy "vehicles_update_admin" on public.vehicles
  for update using (
    (auth.jwt() -> 'app_metadata' ->> 'role_code') in ('owner','admin','super_admin')
  );