-- ============================================================
-- 0010_master_data_write_policies.sql
-- RLS INSERT/UPDATE untuk Categories & Brands — dibatasi role
-- Admin/Owner/Super Admin. TIDAK pakai RPC (bukan tabel finansial
-- inti, sesuai penjelasan Langkah 4.1).
-- ============================================================

create policy "categories_insert_admin" on public.categories
  for insert with check (
    (auth.jwt() -> 'app_metadata' ->> 'role_code') in ('owner','admin','super_admin')
  );

create policy "brands_insert_admin" on public.brands
  for insert with check (
    (auth.jwt() -> 'app_metadata' ->> 'role_code') in ('owner','admin','super_admin')
  );