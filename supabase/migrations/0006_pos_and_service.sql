-- ============================================================
-- 0006_pos_and_service.sql
-- Transactions, Transaction Items, Services, Service Items,
-- Service Status History, Service Estimates, Returns
-- Sesuai Data Dictionary v3 §1.18-1.24 (REVISI: kolom source &
-- service_id di transactions, sesuai keputusan konsolidasi
-- transaksi POS+Servis yang disepakati saat Consistency Review)
-- ============================================================

create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  client_uuid uuid not null unique,
  customer_id uuid references public.customers(id),
  customer_type_used varchar(20) not null default 'general'
    check (customer_type_used in ('general', 'service', 'workshop')),
  cashier_id uuid not null references public.users(id),
  source varchar(20) not null default 'pos'
    check (source in ('pos', 'service')),
  service_id uuid, -- FK ditambahkan setelah tabel services dibuat di bawah
  total_amount numeric(14,2) not null check (total_amount > 0),
  payment_method varchar(20) not null
    check (payment_method in ('cash', 'qris', 'transfer')),
  amount_received numeric(14,2)
    check (payment_method <> 'cash' or amount_received >= total_amount),
  status varchar(20) not null default 'paid'
    check (status in ('paid', 'cancelled')),
  sync_status varchar(20) not null default 'synced'
    check (sync_status in ('pending', 'synced', 'discrepancy')),
  sync_notes varchar(500),
  created_at timestamptz not null default now()
);

create index idx_transactions_cashier_date on public.transactions(cashier_id, created_at);
create unique index idx_transactions_service_unique on public.transactions(service_id)
  where source = 'service';

alter table public.transactions enable row level security;

create policy "transactions_select_own_or_admin" on public.transactions
  for select using (
    cashier_id = auth.uid()
    or (auth.jwt() -> 'app_metadata' ->> 'role_code') in ('owner','admin','super_admin')
  );

create table public.transaction_items (
  id uuid primary key default gen_random_uuid(),
  transaction_id uuid not null references public.transactions(id),
  item_type varchar(20) not null check (item_type in ('product', 'labor')),
  product_id uuid references public.products(id),
  service_item_id uuid, -- FK ditambahkan setelah service_items ada (traceability, lihat §5 catatan)
  name_snapshot varchar(150) not null,
  price_snapshot numeric(14,2) not null check (price_snapshot > 0),
  qty integer not null default 1 check (qty > 0),
  subtotal numeric(14,2) generated always as (price_snapshot * qty) stored,
  constraint chk_txitem_product_required check (
    item_type <> 'product' or product_id is not null
  )
);

create index idx_tx_items_transaction on public.transaction_items(transaction_id);

alter table public.transaction_items enable row level security;

create policy "transaction_items_select_authenticated" on public.transaction_items
  for select using (auth.role() = 'authenticated');

-- ---------- SERVICES ----------
create table public.services (
  id uuid primary key default gen_random_uuid(),
  client_uuid uuid not null unique,
  customer_id uuid not null references public.customers(id),
  vehicle_id uuid references public.vehicles(id),
  complaint varchar(500) not null check (length(complaint) >= 3),
  customer_type_used varchar(20) not null default 'service'
    check (customer_type_used in ('general', 'service', 'workshop')),
  status varchar(30) not null default 'waiting'
    check (status in ('waiting', 'pending_approval', 'in_progress', 'completed', 'paid', 'cancelled')),
  mechanic_id uuid references public.users(id),
  is_warranty_claim boolean not null default false,
  created_by uuid not null references public.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_services_customer on public.services(customer_id);
create index idx_services_vehicle on public.services(vehicle_id);
create index idx_services_status on public.services(status);
create index idx_services_mechanic on public.services(mechanic_id);

alter table public.services enable row level security;

create policy "services_select_authenticated" on public.services
  for select using (auth.role() = 'authenticated');

create trigger set_updated_at
  before update on public.services
  for each row execute function public.trg_set_updated_at();

-- Sekarang tabel services sudah ada, lengkapi FK transactions.service_id
alter table public.transactions
  add constraint fk_transactions_service
  foreign key (service_id) references public.services(id);

create table public.service_items (
  id uuid primary key default gen_random_uuid(),
  service_id uuid not null references public.services(id),
  item_type varchar(20) not null check (item_type in ('product', 'labor')),
  product_id uuid references public.products(id),
  name_snapshot varchar(150) not null,
  price_snapshot numeric(14,2) not null check (price_snapshot > 0),
  qty integer not null default 1 check (qty > 0),
  subtotal numeric(14,2) generated always as (price_snapshot * qty) stored,
  added_by uuid not null references public.users(id),
  created_at timestamptz not null default now(),
  constraint chk_svcitem_product_required check (
    item_type <> 'product' or product_id is not null
  )
);

create index idx_service_items_service on public.service_items(service_id);

alter table public.service_items enable row level security;

create policy "service_items_select_authenticated" on public.service_items
  for select using (auth.role() = 'authenticated');

-- Lengkapi FK stock_consumptions & transaction_items yang tertunda dari file sebelumnya
alter table public.stock_consumptions
  add constraint fk_consumptions_tx_item
  foreign key (transaction_item_id) references public.transaction_items(id);

alter table public.stock_consumptions
  add constraint fk_consumptions_svc_item
  foreign key (service_item_id) references public.service_items(id);

alter table public.transaction_items
  add constraint fk_txitems_svc_item
  foreign key (service_item_id) references public.service_items(id);

create table public.service_status_history (
  id uuid primary key default gen_random_uuid(),
  service_id uuid not null references public.services(id),
  status_from varchar(30),
  status_to varchar(30) not null,
  changed_by uuid not null references public.users(id),
  reason varchar(500),
  created_at timestamptz not null default now()
);

create index idx_status_history_service on public.service_status_history(service_id);

alter table public.service_status_history enable row level security;

create policy "service_status_history_select_authenticated" on public.service_status_history
  for select using (auth.role() = 'authenticated');

create table public.service_estimates (
  id uuid primary key default gen_random_uuid(),
  service_id uuid not null unique references public.services(id),
  total_estimated numeric(14,2) not null check (total_estimated > 0),
  sent_at timestamptz,
  status varchar(20) not null default 'pending'
    check (status in ('pending', 'approved', 'rejected')),
  approved_by uuid references public.users(id),
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.service_estimates enable row level security;

create policy "service_estimates_select_authenticated" on public.service_estimates
  for select using (auth.role() = 'authenticated');

create trigger set_updated_at
  before update on public.service_estimates
  for each row execute function public.trg_set_updated_at();

create table public.returns (
  id uuid primary key default gen_random_uuid(),
  transaction_item_id uuid references public.transaction_items(id),
  service_item_id uuid references public.service_items(id),
  qty_returned integer not null check (qty_returned > 0),
  reason varchar(500) not null check (length(reason) >= 3),
  refund_amount numeric(14,2) not null check (refund_amount >= 0),
  processed_by uuid not null references public.users(id),
  created_at timestamptz not null default now(),
  constraint chk_return_source_xor check (
    (transaction_item_id is not null and service_item_id is null) or
    (transaction_item_id is null and service_item_id is not null)
  )
);

alter table public.returns enable row level security;

create policy "returns_select_authenticated" on public.returns
  for select using (auth.role() = 'authenticated');