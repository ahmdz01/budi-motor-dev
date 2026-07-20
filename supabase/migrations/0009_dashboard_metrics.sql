-- ============================================================
-- 0009_dashboard_metrics.sql
-- RPC agregasi metrik Dashboard. SECURITY DEFINER melewati RLS
-- (table owner bypass) — karena itu WAJIB ada pengecekan role
-- eksplisit di dalam function, bukan mengandalkan RLS semata.
-- ============================================================

create or replace function public.get_dashboard_metrics()
returns table (
  kas_hari_ini numeric,
  dana_restock_total numeric,
  laba_hari_ini numeric,
  barang_menipis_count integer,
  servis_berjalan_count integer,
  hutang_jatuh_tempo_total numeric
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
begin
  -- Pengecekan role WAJIB di sini — SECURITY DEFINER melewati RLS,
  -- jadi tanpa baris ini, siapa pun yang berhasil memanggil RPC ini
  -- (misal lewat API langsung) bisa membaca data finansial sensitif
  -- terlepas dari role sebenarnya.
  v_role := auth.jwt() -> 'app_metadata' ->> 'role_code';

  if v_role is null or v_role not in ('owner', 'admin', 'super_admin') then
    raise exception 'Akses ditolak: hanya Owner/Admin/Super Admin.'
      using errcode = '42501'; -- kode standar Postgres untuk insufficient_privilege
  end if;

  return query
  select
    coalesce((
      select sum(amount) from public.financial_ledger
      where category = 'cash' and created_at::date = current_date
    ), 0),
    coalesce((
      select sum(amount) from public.financial_ledger
      where category = 'restock'
    ), 0),
    coalesce((
      select sum(amount) from public.financial_ledger
      where category = 'profit' and created_at::date = current_date
    ), 0),
    (
      select count(*)::integer from public.products p
      left join public.current_stock_per_product s on s.product_id = p.id
      where p.status = 'active' and coalesce(s.total_stock, 0) <= p.min_stock
    ),
    (
      select count(*)::integer from public.services
      where status in ('waiting', 'pending_approval', 'in_progress')
    ),
    coalesce((
      select sum(sisa_hutang) from public.supplier_debts
      where status = 'unpaid' and due_date <= current_date + interval '7 days'
    ), 0);
end;
$$;

grant execute on function public.get_dashboard_metrics() to authenticated;