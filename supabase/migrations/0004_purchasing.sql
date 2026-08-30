-- =========================================================================
-- 0004_purchasing.sql
-- Purchase orders (stock-in) and their line items.
-- =========================================================================

create table public.purchases (
  id uuid primary key default gen_random_uuid(),
  purchase_number text not null unique,
  supplier_id uuid not null references public.suppliers (id) on delete restrict,
  reference_number text,
  status purchase_status not null default 'draft',
  payment_status payment_status not null default 'unpaid',
  order_date date not null default current_date,
  expected_date date,
  received_at timestamptz,
  subtotal numeric(12, 2) not null default 0,
  total_cost numeric(12, 2) not null default 0,
  notes text,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index purchases_supplier_idx on public.purchases (supplier_id);
create index purchases_status_idx on public.purchases (status);

create table public.purchase_items (
  id uuid primary key default gen_random_uuid(),
  purchase_id uuid not null references public.purchases (id) on delete cascade,
  product_variant_id uuid not null references public.product_variants (id) on delete restrict,
  quantity integer not null check (quantity > 0),
  quantity_received integer not null default 0 check (quantity_received >= 0),
  unit_cost numeric(12, 2) not null check (unit_cost >= 0),
  total_cost numeric(12, 2) not null check (total_cost >= 0),
  created_at timestamptz not null default now(),
  constraint received_lte_ordered check (quantity_received <= quantity)
);
create index purchase_items_purchase_idx on public.purchase_items (purchase_id);
create index purchase_items_variant_idx on public.purchase_items (product_variant_id);
