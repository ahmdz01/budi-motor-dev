
-- ============================================================
-- 0041_fix_k2_view_rls.sql
-- K2: Amankan view agar mengikuti privilege dan RLS pemanggil.
--
-- anon          : tidak boleh mengakses view ini.
-- authenticated : hanya SELECT, dengan RLS tabel dasar berlaku.
-- service_role  : privilege yang sudah ada tidak diubah.
-- postgres      : tetap sebagai owner database.
-- ============================================================

begin;

-- 1. Aktifkan security invoker pada kelima view.
-- Pemeriksaan privilege dan RLS tabel dasar dilakukan
-- berdasarkan role yang mengakses view.

alter view public.current_stock_per_product
  set (security_invoker = true);

alter view public.supplier_outstanding_debts
  set (security_invoker = true);

alter view public.product_list_view
  set (security_invoker = true);

alter view public.service_list_view
  set (security_invoker = true);

alter view public.ledger_daily_summary
  set (security_invoker = true);


-- 2. Cabut seluruh privilege dari PUBLIC dan anon.
-- Halaman login tidak membutuhkan akses langsung ke view ini.

revoke all privileges on table
  public.current_stock_per_product,
  public.supplier_outstanding_debts,
  public.product_list_view,
  public.service_list_view,
  public.ledger_daily_summary
from public, anon;


-- 3. Batasi authenticated menjadi SELECT saja.
-- Hak baca tetap tunduk pada privilege dan RLS tabel dasar.

revoke all privileges on table
  public.current_stock_per_product,
  public.supplier_outstanding_debts,
  public.product_list_view,
  public.service_list_view,
  public.ledger_daily_summary
from authenticated;

grant select on table
  public.current_stock_per_product,
  public.supplier_outstanding_debts,
  public.product_list_view,
  public.service_list_view,
  public.ledger_daily_summary
to authenticated;

commit;