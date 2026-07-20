-- ============================================================
-- 0005_inventory.sql
-- Inventory Batches, Stock Consumptions, Stock Opname
-- Sesuai Data Dictionary v3 §1.14-1.17
-- ============================================================

create table public.inventory_batches (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id),
  purchase_item_id uuid unique references public.purchase_items(id),
  source_type varchar(20) not null default 'purchase'
    check (source_type in ('purchase', 'adjustment')),
  qty_awal integer not null check (qty_awal > 0),
  qty_sisa integer not null check (qty_sisa >= 0),
  harga_beli numeric(14,2) not null check (harga_beli > 0),
  expiry_date date,
  received_at timestamptz not null default now(),
  status varchar(20) not null default 'active'
    check (status in ('active', 'depleted'))
);

-- Composite index KRUSIAL untuk query FIFO (ambil batch tertua
-- yang masih aktif) — dipanggil di SETIAP item transaksi/servis.
create index idx_batches_fifo on public.inventory_batches
  (product_id, status, received_at);

create index idx_batches_expiry on public.inventory_batches(expiry_date)
  where expiry_date is not null and status = 'active';

alter table public.inventory_batches enable row level security;

create policy "inventory_batches_select_authenticated" on public.inventory_batches
  for select using (auth.role() = 'authenticated');

create table public.stock_consumptions (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references public.inventory_batches(id),
  transaction_item_id uuid, -- FK ditambahkan setelah tabel transactions ada (lihat 0006)
  service_item_id uuid,     -- FK ditambahkan setelah tabel services ada (lihat 0007)
  qty integer not null check (qty <> 0),
  hpp_at_time numeric(14,2) not null,
  created_at timestamptz not null default now(),
  constraint chk_consumption_source_xor check (
    (transaction_item_id is not null and service_item_id is null) or
    (transaction_item_id is null and service_item_id is not null)
  )
);

create index idx_consumptions_batch on public.stock_consumptions(batch_id);

alter table public.stock_consumptions enable row level security;

create policy "stock_consumptions_select_authenticated" on public.stock_consumptions
  for select using (auth.role() = 'authenticated');

create table public.stock_opname_sessions (
  id uuid primary key default gen_random_uuid(),
  scope_type varchar(20) not null default 'manual'
    check (scope_type in ('category', 'location', 'manual')),
  scope_value varchar(100),
  started_by uuid not null references public.users(id),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  status varchar(20) not null default 'in_progress'
    check (status in ('in_progress', 'completed'))
);

alter table public.stock_opname_sessions enable row level security;

create policy "stock_opname_sessions_select_authenticated" on public.stock_opname_sessions
  for select using (auth.role() = 'authenticated');

create table public.stock_opname_items (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.stock_opname_sessions(id),
  product_id uuid not null references public.products(id),
  stok_sistem integer not null check (stok_sistem >= 0),
  stok_fisik integer not null check (stok_fisik >= 0),
  selisih integer generated always as (stok_fisik - stok_sistem) stored,
  reason varchar(500),
  adjustment_batch_id uuid references public.inventory_batches(id),
  created_at timestamptz not null default now()
);

create index idx_opname_items_session on public.stock_opname_items(session_id);

alter table public.stock_opname_items enable row level security;

create policy "stock_opname_items_select_authenticated" on public.stock_opname_items
  for select using (auth.role() = 'authenticated');