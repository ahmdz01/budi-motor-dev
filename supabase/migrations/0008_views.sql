-- ============================================================
-- 0008_views.sql
-- View biasa (BUKAN materialized) — sesuai keputusan Consistency
-- Review Final: volume data bengkel 1 cabang masih kecil untuk
-- agregasi langsung terasa lambat, materialized view ditunda
-- sampai benar-benar terbukti dibutuhkan (lihat Data Dictionary
-- v3 §2 - Entity Ditunda ke Phase 2).
-- ============================================================

create view public.current_stock_per_product as
select
  product_id,
  sum(qty_sisa) as total_stock
from public.inventory_batches
where status = 'active'
group by product_id;

create view public.supplier_outstanding_debts as
select
  supplier_id,
  sum(sisa_hutang) as total_outstanding
from public.supplier_debts
where status = 'unpaid'
group by supplier_id;