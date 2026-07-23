-- ============================================================
-- 0028_ledger_daily_view.sql
-- Langkah 10.1 — View agregasi harian financial_ledger, dasar
-- untuk Laporan Penjualan & Laba. View biasa (bukan materialized),
-- konsisten dengan keputusan 0008_views.sql — volume data 1 cabang
-- masih kecil untuk agregasi real-time terasa lambat.
-- ============================================================

create view public.ledger_daily_summary as
select
  created_at::date as report_date,
  category,
  sum(amount) as total_amount,
  count(*) as entry_count
from public.financial_ledger
group by created_at::date, category;