-- ============================================================
-- 0007_financial_and_config.sql
-- Financial Ledger, Audit Logs, Service Catalog, Store Settings
-- Sesuai Data Dictionary v3 §1.25-1.28
-- ============================================================

create table public.financial_ledger (
  id uuid primary key default gen_random_uuid(),
  category varchar(20) not null
    check (category in ('cash', 'restock', 'profit', 'operational')),
  amount numeric(14,2) not null,
  reference_type varchar(30) not null
    check (reference_type in ('transaction', 'purchase', 'return', 'manual')),
  reference_id uuid,
  description varchar(200),
  created_at timestamptz not null default now()
);

create index idx_ledger_category_date on public.financial_ledger(category, created_at);
create index idx_ledger_reference on public.financial_ledger(reference_type, reference_id);

alter table public.financial_ledger enable row level security;

create policy "financial_ledger_select_admin" on public.financial_ledger
  for select using (
    (auth.jwt() -> 'app_metadata' ->> 'role_code') in ('owner','admin','super_admin')
  );

-- ---------- AUDIT LOGS ----------
-- entity_type & action SENGAJA tanpa CHECK constraint ketat —
-- modul baru di masa depan akan terus menambah entity_type baru,
-- mengunci dengan CHECK berarti tiap fitur baru butuh migrasi
-- hanya untuk audit (lihat Consistency Review Final).
create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  entity_type varchar(30) not null,
  entity_id uuid not null,
  action varchar(20) not null,
  old_value jsonb,
  new_value jsonb,
  user_id uuid not null references public.users(id),
  created_at timestamptz not null default now()
);

create index idx_audit_entity on public.audit_logs(entity_type, entity_id);
create index idx_audit_user on public.audit_logs(user_id);

alter table public.audit_logs enable row level security;

create policy "audit_logs_select_admin" on public.audit_logs
  for select using (
    (auth.jwt() -> 'app_metadata' ->> 'role_code') in ('owner','admin','super_admin')
  );
-- TIDAK ADA policy update/delete untuk role manapun — audit log
-- append-only secara struktural (Critical C3 & BR-AUD-02).

-- ---------- SERVICE CATALOG ----------
create table public.service_catalog (
  id uuid primary key default gen_random_uuid(),
  name varchar(100) not null,
  default_price numeric(14,2) not null check (default_price > 0),
  usage_count integer not null default 0,
  warranty_days smallint check (warranty_days > 0),
  status varchar(20) not null default 'active'
    check (status in ('active', 'inactive')),
  created_at timestamptz not null default now()
);

create index idx_catalog_usage on public.service_catalog(usage_count desc);

alter table public.service_catalog enable row level security;

create policy "service_catalog_select_authenticated" on public.service_catalog
  for select using (auth.role() = 'authenticated');

-- ---------- STORE SETTINGS ----------
create table public.store_settings (
  id uuid primary key default gen_random_uuid(),
  store_name varchar(100) not null,
  address varchar(500),
  phone_number varchar(20),
  stock_opname_threshold_percent smallint not null default 10
    check (stock_opname_threshold_percent between 1 and 100),
  large_transaction_threshold numeric(14,2) not null default 500000,
  updated_by uuid references public.users(id),
  updated_at timestamptz not null default now()
);

alter table public.store_settings enable row level security;

create policy "store_settings_select_authenticated" on public.store_settings
  for select using (auth.role() = 'authenticated');

-- Seed 1 baris singleton — TIDAK ADA privilege insert untuk
-- authenticated, memastikan tabel ini terkunci struktural
-- sebagai 1 baris (sesuai revisi Consistency Review Final).
insert into public.store_settings (store_name)
values ('Budi Motor');