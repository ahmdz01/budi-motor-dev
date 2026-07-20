-- ============================================================
-- 0013_suppliers_write_policy.sql
-- RLS INSERT untuk Suppliers — dibatasi Admin/Owner/Super Admin.
-- Sesuai rencana yang dicatat di Langkah 4.3: pembuatan supplier
-- baru dilakukan inline lewat combobox "pilih atau tambah baru"
-- di form Barang Masuk (Langkah 5.1), bukan RPC (bukan tabel
-- finansial inti — sama seperti Categories/Brands/Products).
-- ============================================================

create policy "suppliers_insert_admin" on public.suppliers
  for insert with check (
    (auth.jwt() -> 'app_metadata' ->> 'role_code') in ('owner','admin','super_admin')
  );