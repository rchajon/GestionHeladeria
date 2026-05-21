-- ============================================================
-- HELADOS ERP - SUPABASE SCHEMA
-- Run this SQL in your Supabase SQL Editor (Database > SQL Editor)
-- ============================================================

-- ─────────────────────────────────────────
-- 0. EXTENSIONS
-- ─────────────────────────────────────────
create extension if not exists "uuid-ossp";

-- ─────────────────────────────────────────
-- 1. ENUM TYPES
-- ─────────────────────────────────────────
create type public.user_role as enum ('admin', 'client');

create type public.order_status as enum (
  'pending',
  'awaiting_payment',
  'paid',
  'in_delivery',
  'delivered',
  'cancelled'
);

create type public.payment_method as enum ('card', 'transfer');

create type public.payment_status as enum ('pending', 'approved', 'rejected');

create type public.movement_type as enum ('in', 'out', 'adjustment');

-- ─────────────────────────────────────────
-- 2. PROFILES (extends auth.users)
-- ─────────────────────────────────────────
create table public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  full_name     text not null,
  email         text not null,
  phone         text,
  role          public.user_role not null default 'client',
  business_name text,                        -- name of the reseller business
  tax_id        text,                        -- NIT / RFC / RUC
  address       text,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ─────────────────────────────────────────
-- 3. PRODUCTS (Ice cream flavors / SKUs)
-- ─────────────────────────────────────────
create table public.products (
  id              uuid primary key default uuid_generate_v4(),
  name            text not null,
  description     text,
  flavor          text not null,
  price_per_unit  numeric(10,2) not null check (price_per_unit > 0),
  unit_label      text not null default 'paquete',  -- e.g. paquete, caja, unidad
  stock           integer not null default 0 check (stock >= 0),
  min_stock       integer not null default 10,       -- alert threshold
  image_url       text,
  is_active       boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ─────────────────────────────────────────
-- 4. ORDERS
-- ─────────────────────────────────────────
create table public.orders (
  id              uuid primary key default uuid_generate_v4(),
  client_id       uuid not null references public.profiles(id) on delete restrict,
  status          public.order_status not null default 'pending',
  total_amount    numeric(12,2) not null default 0,
  notes           text,
  delivery_date   date,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ─────────────────────────────────────────
-- 5. ORDER ITEMS
-- ─────────────────────────────────────────
create table public.order_items (
  id          uuid primary key default uuid_generate_v4(),
  order_id    uuid not null references public.orders(id) on delete cascade,
  product_id  uuid not null references public.products(id) on delete restrict,
  quantity    integer not null check (quantity > 0),
  unit_price  numeric(10,2) not null check (unit_price > 0),  -- snapshot at time of order
  subtotal    numeric(12,2) generated always as (quantity * unit_price) stored,
  created_at  timestamptz not null default now()
);

-- ─────────────────────────────────────────
-- 6. PAYMENTS
-- ─────────────────────────────────────────
create table public.payments (
  id                uuid primary key default uuid_generate_v4(),
  order_id          uuid not null references public.orders(id) on delete cascade,
  client_id         uuid not null references public.profiles(id) on delete restrict,
  method            public.payment_method not null,
  amount            numeric(12,2) not null check (amount > 0),
  status            public.payment_status not null default 'pending',
  -- Card payment (simulated)
  card_last4        char(4),
  card_holder       text,
  gateway_response  jsonb,                    -- fake gateway response payload
  -- Transfer payment
  voucher_url       text,                     -- Supabase Storage URL
  voucher_reference text,                     -- bank reference number
  admin_notes       text,
  reviewed_by       uuid references public.profiles(id),
  reviewed_at       timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- ─────────────────────────────────────────
-- 7. INVENTORY MOVEMENTS
-- ─────────────────────────────────────────
create table public.inventory_movements (
  id           uuid primary key default uuid_generate_v4(),
  product_id   uuid not null references public.products(id) on delete restrict,
  movement_type public.movement_type not null,
  quantity     integer not null,              -- positive always; sign determined by movement_type
  stock_before integer not null,
  stock_after  integer not null,
  reference_id uuid,                          -- order_id, production_id, etc.
  reference_type text,                        -- 'order', 'production', 'adjustment'
  notes        text,
  created_by   uuid references public.profiles(id),
  created_at   timestamptz not null default now()
);

-- ─────────────────────────────────────────
-- 8. PRODUCTION RECORDS
-- ─────────────────────────────────────────
create table public.production_records (
  id           uuid primary key default uuid_generate_v4(),
  product_id   uuid not null references public.products(id) on delete restrict,
  quantity      integer not null check (quantity > 0),
  batch_notes  text,
  produced_at  date not null default current_date,
  created_by   uuid not null references public.profiles(id),
  created_at   timestamptz not null default now()
);

-- ─────────────────────────────────────────
-- 9. INDEXES
-- ─────────────────────────────────────────
create index idx_orders_client_id   on public.orders(client_id);
create index idx_orders_status      on public.orders(status);
create index idx_order_items_order  on public.order_items(order_id);
create index idx_order_items_prod   on public.order_items(product_id);
create index idx_payments_order     on public.payments(order_id);
create index idx_payments_client    on public.payments(client_id);
create index idx_inventory_product  on public.inventory_movements(product_id);
create index idx_production_product on public.production_records(product_id);

-- ─────────────────────────────────────────
-- 10. HELPER FUNCTIONS
-- ─────────────────────────────────────────

-- Returns the role of the current authenticated user
create or replace function public.get_my_role()
returns public.user_role
language sql
stable
security definer
as $$
  select role from public.profiles where id = auth.uid();
$$;

-- Trigger: keep updated_at current
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_profiles_updated_at  before update on public.profiles  for each row execute procedure public.set_updated_at();
create trigger trg_products_updated_at  before update on public.products  for each row execute procedure public.set_updated_at();
create trigger trg_orders_updated_at    before update on public.orders    for each row execute procedure public.set_updated_at();
create trigger trg_payments_updated_at  before update on public.payments  for each row execute procedure public.set_updated_at();

-- ─────────────────────────────────────────
-- 11. RLS POLICIES
-- ─────────────────────────────────────────

-- Enable RLS on all tables
alter table public.profiles             enable row level security;
alter table public.products             enable row level security;
alter table public.orders               enable row level security;
alter table public.order_items          enable row level security;
alter table public.payments             enable row level security;
alter table public.inventory_movements  enable row level security;
alter table public.production_records   enable row level security;

-- ── PROFILES ──────────────────────────────
-- Users can only read their own profile; admins see all
create policy "profiles_select_own"
  on public.profiles for select
  using (id = auth.uid() or public.get_my_role() = 'admin');

create policy "profiles_insert_own"
  on public.profiles for insert
  with check (id = auth.uid());

create policy "profiles_update_own"
  on public.profiles for update
  using (id = auth.uid() or public.get_my_role() = 'admin');

create policy "profiles_delete_admin"
  on public.profiles for delete
  using (public.get_my_role() = 'admin');

-- ── PRODUCTS ──────────────────────────────
-- All authenticated users can read active products
create policy "products_select_all"
  on public.products for select
  using (auth.uid() is not null and (is_active = true or public.get_my_role() = 'admin'));

create policy "products_insert_admin"
  on public.products for insert
  with check (public.get_my_role() = 'admin');

create policy "products_update_admin"
  on public.products for update
  using (public.get_my_role() = 'admin');

create policy "products_delete_admin"
  on public.products for delete
  using (public.get_my_role() = 'admin');

-- ── ORDERS ────────────────────────────────
create policy "orders_select"
  on public.orders for select
  using (client_id = auth.uid() or public.get_my_role() = 'admin');

create policy "orders_insert"
  on public.orders for insert
  with check (client_id = auth.uid() or public.get_my_role() = 'admin');

create policy "orders_update"
  on public.orders for update
  using (client_id = auth.uid() or public.get_my_role() = 'admin');

create policy "orders_delete_admin"
  on public.orders for delete
  using (public.get_my_role() = 'admin');

-- ── ORDER ITEMS ───────────────────────────
create policy "order_items_select"
  on public.order_items for select
  using (
    exists (
      select 1 from public.orders o
      where o.id = order_id
        and (o.client_id = auth.uid() or public.get_my_role() = 'admin')
    )
  );

create policy "order_items_insert"
  on public.order_items for insert
  with check (
    exists (
      select 1 from public.orders o
      where o.id = order_id
        and (o.client_id = auth.uid() or public.get_my_role() = 'admin')
    )
  );

create policy "order_items_update_admin"
  on public.order_items for update
  using (public.get_my_role() = 'admin');

create policy "order_items_delete_admin"
  on public.order_items for delete
  using (public.get_my_role() = 'admin');

-- ── PAYMENTS ──────────────────────────────
create policy "payments_select"
  on public.payments for select
  using (client_id = auth.uid() or public.get_my_role() = 'admin');

create policy "payments_insert"
  on public.payments for insert
  with check (client_id = auth.uid() or public.get_my_role() = 'admin');

create policy "payments_update_admin"
  on public.payments for update
  using (public.get_my_role() = 'admin');

-- ── INVENTORY MOVEMENTS ───────────────────
create policy "inventory_select_admin"
  on public.inventory_movements for select
  using (public.get_my_role() = 'admin');

create policy "inventory_insert_admin"
  on public.inventory_movements for insert
  with check (public.get_my_role() = 'admin');

-- ── PRODUCTION RECORDS ────────────────────
create policy "production_select_admin"
  on public.production_records for select
  using (public.get_my_role() = 'admin');

create policy "production_insert_admin"
  on public.production_records for insert
  with check (public.get_my_role() = 'admin');

create policy "production_update_admin"
  on public.production_records for update
  using (public.get_my_role() = 'admin');

-- ─────────────────────────────────────────
-- 12. STORAGE BUCKET (for payment vouchers)
-- ─────────────────────────────────────────
-- Run via Supabase Dashboard > Storage > New Bucket
-- OR via this SQL using the storage schema:
insert into storage.buckets (id, name, public)
values ('vouchers', 'vouchers', false)
on conflict (id) do nothing;

-- Policy: clients can upload their own vouchers
create policy "vouchers_upload_client"
  on storage.objects for insert
  with check (
    bucket_id = 'vouchers'
    and auth.uid() is not null
  );

-- Policy: admins and owners can read vouchers
create policy "vouchers_select"
  on storage.objects for select
  using (
    bucket_id = 'vouchers'
    and (
      public.get_my_role() = 'admin'
      or (storage.foldername(name))[1] = auth.uid()::text
    )
  );

-- ─────────────────────────────────────────
-- 13. SEED DATA (optional dev data)
-- ─────────────────────────────────────────
-- Insert sample products (run after creating your admin user)
insert into public.products (name, description, flavor, price_per_unit, unit_label, stock, min_stock)
values
  ('Helado de Coco',        'Sabor natural de coco',                    'Coco',         50.00, 'bolsa x10', 0, 10),
  ('Helado Mora Coco',      'Combinación de mora y coco',               'Mora Coco',    50.00, 'bolsa x10', 0, 10),
  ('Helado Fresa Coco',     'Fresa con toque de coco',                  'Fresa Coco',   50.00, 'bolsa x10', 0, 10),
  ('Helado Fresa Crema',    'Fresa con crema suave',                    'Fresa Crema',  50.00, 'bolsa x10', 0, 10),
  ('Helado Oreo',           'Crema con galleta Oreo',                   'Oreo',         50.00, 'bolsa x10', 0, 10),
  ('Helado de Manía',       'Sabor a maní tostado',                     'Manía',        50.00, 'bolsa x10', 0, 10),
  ('Helado de Higo',        'Sabor natural de higo',                    'Higo',         50.00, 'bolsa x10', 0, 10),
  ('Helado de Frutas',      'Mezcla de frutas tropicales',              'Frutas',       50.00, 'bolsa x10', 0, 10),
  ('Helado de Melocotón',   'Sabor a melocotón fresco',                 'Melocotón',    50.00, 'bolsa x10', 0, 10),
  ('Helado Piña Colada',    'Piña con coco estilo piña colada',         'Piña Colada',  50.00, 'bolsa x10', 0, 10),
  ('Helado Piña Fresa',     'Combinación de piña y fresa',              'Piña Fresa',   50.00, 'bolsa x10', 0, 10),
  ('Helado Piña Mora',      'Combinación de piña y mora',               'Piña Mora',    50.00, 'bolsa x10', 0, 10),
  ('Helado Mango Maduro',   'Mango maduro natural',                     'Mango Maduro', 50.00, 'bolsa x10', 0, 10),
  ('Helado Mango Fresa',    'Combinación de mango y fresa',             'Mango Fresa',  50.00, 'bolsa x10', 0, 10),
  ('Helado Mango Mora',     'Combinación de mango y mora',              'Mango Mora',   50.00, 'bolsa x10', 0, 10),
  ('Helado de Chocolate',   'Chocolate cremoso',                        'Chocolate',    50.00, 'bolsa x10', 0, 10),
  ('Helado de Café',        'Café guatemalteco',                        'Café',         50.00, 'bolsa x10', 0, 10),
  ('Helado Chocococo',      'Chocolate con coco',                       'Chocococo',    50.00, 'bolsa x10', 0, 10),
  ('Helado Crema Pasas',    'Crema con pasas',                          'Crema Pasas',  50.00, 'bolsa x10', 0, 10);
