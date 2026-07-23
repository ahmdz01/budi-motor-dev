-- ============================================================
-- 0031_service_catalog_write_policy.sql
-- Langkah 11.3 — RLS INSERT/UPDATE untuk service_catalog, dibatasi
-- Owner/Admin/Super Admin. TIDAK pakai RPC (bukan tabel finansial
-- inti, sama seperti Categories/Brands/Products — lihat penjelasan
-- Langkah 4.1 & 4.2). Sengaja TIDAK ada policy DELETE — konsisten
-- prinsip soft delete, nonaktifkan lewat kolom status.
-- ============================================================

create policy "service_catalog_insert_admin" on public.service_catalog
  for insert with check (
    (auth.jwt() -> 'app_metadata' ->> 'role_code') in ('owner','admin','super_admin')
  );

create policy "service_catalog_update_admin" on public.service_catalog
  for update using (
    (auth.jwt() -> 'app_metadata' ->> 'role_code') in ('owner','admin','super_admin')
  );