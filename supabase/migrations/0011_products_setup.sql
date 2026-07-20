-- ============================================================
-- 0011_products_setup.sql
-- RLS write policies, SKU auto-generator, barcode internal
-- default, dan view gabungan untuk Daftar Barang (produk + stok).
-- ============================================================

-- ---------- RLS WRITE POLICIES ----------
create policy "products_insert_admin" on public.products
  for insert with check (
    (auth.jwt() -> 'app_metadata' ->> 'role_code') in ('owner','admin','super_admin')
  );

create policy "products_update_admin" on public.products
  for update using (
    (auth.jwt() -> 'app_metadata' ->> 'role_code') in ('owner','admin','super_admin')
  );

create policy "product_prices_insert_admin" on public.product_prices
  for insert with check (
    (auth.jwt() -> 'app_metadata' ->> 'role_code') in ('owner','admin','super_admin')
  );

create policy "product_prices_update_admin" on public.product_prices
  for update using (
    (auth.jwt() -> 'app_metadata' ->> 'role_code') in ('owner','admin','super_admin')
  );

-- ---------- SKU AUTO-GENERATOR ----------
create sequence public.product_sku_seq start 1;

create or replace function public.trg_set_product_sku()
returns trigger
language plpgsql
as $$
begin
  if new.sku is null then
    new.sku := 'PRD-' || lpad(nextval('public.product_sku_seq')::text, 6, '0');
  end if;

  -- Barcode internal: kalau Admin tidak scan/input barcode pabrik,
  -- pakai SKU sebagai barcode internal (BR tambahan — Barcode
  -- Generator untuk barang tanpa barcode dari supplier).
  if new.barcode is null then
    new.barcode := new.sku;
    new.barcode_source := 'internal';
  end if;

  return new;
end;
$$;

create trigger set_product_sku
  before insert on public.products
  for each row execute function public.trg_set_product_sku();

-- ---------- VIEW: Daftar Barang + Stok (gabungan, untuk list & search) ----------
create view public.product_list_view as
select
  p.id,
  p.sku,
  p.barcode,
  p.name,
  p.category_id,
  c.name as category_name,
  p.brand_id,
  b.name as brand_name,
  p.location_label,
  p.min_stock,
  p.status,
  coalesce(s.total_stock, 0) as total_stock
from public.products p
left join public.categories c on c.id = p.category_id
left join public.brands b on b.id = p.brand_id
left join public.current_stock_per_product s on s.product_id = p.id;