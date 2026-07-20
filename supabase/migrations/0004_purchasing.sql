-- ============================================================
-- 0004_purchasing.sql
-- Purchases, Purchase Items, Supplier Debts, Debt Payments
-- Sesuai Data Dictionary v3 §1.10-1.13
-- ============================================================

create table public.purchases (
  id uuid primary key default gen_random_uuid(),
  client_uuid uuid not null unique,
  supplier_id uuid not null references public.suppliers(id),
  purchase_date date not null default current_date,
  total_amount numeric(14,2) not null check (total_amount > 0),
  payment_status varchar(20) not null default 'unpaid'
    check (payment_status in ('paid', 'partial', 'unpaid')),
  amount_paid numeric(14,2) not null default 0 check (amount_paid >= 0),
  created_by uuid not null references public.users(id),
  sync_status varchar(20) not null default 'synced'
    check (sync_status in ('pending', 'synced')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chk_amount_paid_valid check (amount_paid <= total_amount)
);

create index idx_purchases_supplier on public.purchases(supplier_id);
create index idx_purchases_date on public.purchases(purchase_date);

alter table public.purchases enable row level security;
-- Tabel finansial inti: SELECT boleh untuk authenticated (difilter aplikasi
-- sesuai role), tapi INSERT/UPDATE/DELETE TIDAK diberikan sama sekali di
-- sini — sesuai privilege model Data Dictionary v3 §0, hanya RPC
-- SECURITY DEFINER yang boleh menulis (dibangun saat Phase 5/Inventory).
create policy "purchases_select_authenticated" on public.purchases
  for select using (auth.role() = 'authenticated');

create trigger set_updated_at
  before update on public.purchases
  for each row execute function public.trg_set_updated_at();

create table public.purchase_items (
  id uuid primary key default gen_random_uuid(),
  purchase_id uuid not null references public.purchases(id),
  product_id uuid not null references public.products(id),
  qty integer not null check (qty > 0),
  unit_price numeric(14,2) not null check (unit_price > 0),
  subtotal numeric(14,2) generated always as (qty * unit_price) stored,
  created_at timestamptz not null default now()
);

create index idx_purchase_items_purchase on public.purchase_items(purchase_id);

alter table public.purchase_items enable row level security;

create policy "purchase_items_select_authenticated" on public.purchase_items
  for select using (auth.role() = 'authenticated');

create table public.supplier_debts (
  id uuid primary key default gen_random_uuid(),
  purchase_id uuid not null unique references public.purchases(id),
  supplier_id uuid not null references public.suppliers(id),
  total_tagihan numeric(14,2) not null check (total_tagihan > 0),
  total_dibayar numeric(14,2) not null default 0 check (total_dibayar >= 0),
  sisa_hutang numeric(14,2) generated always as (total_tagihan - total_dibayar) stored,
  due_date date,
  status varchar(20) not null default 'unpaid'
    check (status in ('unpaid', 'paid')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_supplier_debts_supplier on public.supplier_debts(supplier_id);
create index idx_supplier_debts_status on public.supplier_debts(status);
create index idx_supplier_debts_due_date on public.supplier_debts(due_date)
  where status = 'unpaid';

alter table public.supplier_debts enable row level security;

create policy "supplier_debts_select_authenticated" on public.supplier_debts
  for select using (auth.role() = 'authenticated');

create trigger set_updated_at
  before update on public.supplier_debts
  for each row execute function public.trg_set_updated_at();

create table public.supplier_debt_payments (
  id uuid primary key default gen_random_uuid(),
  supplier_debt_id uuid not null references public.supplier_debts(id),
  amount numeric(14,2) not null check (amount > 0),
  payment_method varchar(20) not null default 'cash'
    check (payment_method in ('cash', 'transfer')),
  paid_by uuid not null references public.users(id),
  created_at timestamptz not null default now()
);

create index idx_debt_payments_debt on public.supplier_debt_payments(supplier_debt_id);

alter table public.supplier_debt_payments enable row level security;

create policy "supplier_debt_payments_select_authenticated" on public.supplier_debt_payments
  for select using (auth.role() = 'authenticated');