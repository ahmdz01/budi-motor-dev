-- ============================================================
-- 0003_master_data.sql
-- Categories, Brands, Products, Product Prices, Suppliers,
-- Customers, Vehicles — sesuai Data Dictionary v3 §1.3-1.9
-- ============================================================

create extension if not exists citext;

-- ---------- CATEGORIES ----------
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name citext not null unique,
  created_at timestamptz not null default now()
);

alter table public.categories enable row level security;

create policy "categories_select_authenticated" on public.categories
  for select using (auth.role() = 'authenticated');

-- ---------- BRANDS ----------
create table public.brands (
  id uuid primary key default gen_random_uuid(),
  name citext not null unique,
  created_at timestamptz not null default now()
);

alter table public.brands enable row level security;

create policy "brands_select_authenticated" on public.brands
  for select using (auth.role() = 'authenticated');

-- ---------- PRODUCTS ----------
create table public.products (
  id uuid primary key default gen_random_uuid(),
  sku varchar(30) not null unique,
  barcode varchar(50) unique,
  barcode_source varchar(20) not null default 'internal'
    check (barcode_source in ('internal', 'factory')),
  name citext not null,
  category_id uuid references public.categories(id),
  brand_id uuid references public.brands(id),
  location_label varchar(30),
  min_stock integer not null default 0 check (min_stock >= 0),
  status varchar(20) not null default 'active'
    check (status in ('active', 'inactive')),
  created_by uuid not null references public.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_products_name on public.products using gin (name gin_trgm_ops);
create index idx_products_category on public.products(category_id);
create index idx_products_status on public.products(status);

alter table public.products enable row level security;

create policy "products_select_authenticated" on public.products
  for select using (auth.role() = 'authenticated');

create trigger set_updated_at
  before update on public.products
  for each row execute function public.trg_set_updated_at();

-- ---------- PRODUCT PRICES ----------
create table public.product_prices (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id),
  price_type varchar(20) not null
    check (price_type in ('general', 'service', 'workshop')),
  price_value numeric(14,2) not null check (price_value > 0),
  updated_by uuid not null references public.users(id),
  updated_at timestamptz not null default now(),
  unique (product_id, price_type)
);

alter table public.product_prices enable row level security;

create policy "product_prices_select_authenticated" on public.product_prices
  for select using (auth.role() = 'authenticated');

-- ---------- SUPPLIERS ----------
create table public.suppliers (
  id uuid primary key default gen_random_uuid(),
  name varchar(100) not null,
  phone_number varchar(20),
  address varchar(500),
  default_payment_term_days smallint check (default_payment_term_days >= 0),
  status varchar(20) not null default 'active'
    check (status in ('active', 'inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_suppliers_name on public.suppliers using gin (name gin_trgm_ops);

alter table public.suppliers enable row level security;

create policy "suppliers_select_authenticated" on public.suppliers
  for select using (auth.role() = 'authenticated');

create trigger set_updated_at
  before update on public.suppliers
  for each row execute function public.trg_set_updated_at();

-- ---------- CUSTOMERS ----------
create table public.customers (
  id uuid primary key default gen_random_uuid(),
  phone_number varchar(20) not null unique,
  name varchar(100) not null,
  customer_type varchar(20) not null default 'general'
    check (customer_type in ('general', 'service', 'workshop')),
  address varchar(500),
  status varchar(20) not null default 'active'
    check (status in ('active', 'inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.customers enable row level security;

create policy "customers_select_authenticated" on public.customers
  for select using (auth.role() = 'authenticated');

create trigger set_updated_at
  before update on public.customers
  for each row execute function public.trg_set_updated_at();

-- ---------- VEHICLES ----------
create table public.vehicles (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id),
  police_plate varchar(20),
  motor_brand varchar(50),
  motor_model varchar(50),
  notes varchar(500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index idx_vehicles_plate_unique on public.vehicles(police_plate)
  where police_plate is not null;
create index idx_vehicles_customer on public.vehicles(customer_id);

alter table public.vehicles enable row level security;

create policy "vehicles_select_authenticated" on public.vehicles
  for select using (auth.role() = 'authenticated');

create trigger set_updated_at
  before update on public.vehicles
  for each row execute function public.trg_set_updated_at();