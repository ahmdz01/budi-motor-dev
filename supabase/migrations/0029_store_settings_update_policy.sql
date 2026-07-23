-- ============================================================
-- 0029_store_settings_update_policy.sql
-- Langkah 11.1 — RLS UPDATE untuk store_settings, dibatasi
-- Owner/Admin/Super Admin. TIDAK ada policy INSERT/DELETE —
-- tabel ini tetap singleton terkunci struktural (baris tunggal
-- yang di-seed sejak migrasi awal), sesuai keputusan Consistency
-- Review Final.
-- ============================================================

create policy "store_settings_update_admin" on public.store_settings
  for update using (
    (auth.jwt() -> 'app_metadata' ->> 'role_code') in ('owner','admin','super_admin')
  );