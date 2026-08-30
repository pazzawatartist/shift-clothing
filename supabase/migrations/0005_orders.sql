-- =========================================================================
-- 0005_orders.sql
-- Orders (POS + online), line items, payments, status timeline, and
-- promo codes. Totals are always computed server-side in
-- public.create_order() (see 0007_functions.sql) — never trust client math.
-- =========================================================================

create table public.promo_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  type discount_type not null,
  value numeric(12, 2) not null check (value > 0),
  max_discount_amount numeric(12, 2) check (max_discount_amount is null or max_discount_amount >= 0),
  min_order_amount numeric(12, 2) not null default 0,
  usage_limit integer,
  usage_count integer not null default 0,
  starts_at timestamptz,
  ends_at timestamptz,
  status entity_status not null default 'active',
  created_at timestamptz not null default now(),
  constraint percentage_lte_100 check (type <> 'percentage' or value <= 100)
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,
  customer_id uuid references public.customers (id) on delete set null,
  sales_channel sales_channel not null default 'pos',
  status order_status not null default 'pending',
  payment_status payment_status not null default 'unpaid',
  payment_method payment_method,
  promo_code_id uuid references public.promo_codes (id) on delete set null,
  discount_type discount_type,
  discount_value numeric(12, 2) not null default 0 check (discount_value >= 0),
  discount_amount numeric(12, 2) not null default 0 check (discount_amount >= 0),
  subtotal numeric(12, 2) not null default 0 check (subtotal >= 0),
  tax_amount numeric(12, 2) not null default 0 check (tax_amount >= 0),
  shipping_amount numeric(12, 2) not null default 0 check (shipping_amount >= 0),
  total_amount numeric(12, 2) not null default 0 check (total_amount >= 0),
  amount_paid numeric(12, 2) not null default 0 check (amount_paid >= 0),
  change_amount numeric(12, 2) not null default 0 check (change_amount >= 0),
  shipping_address text,
  shipping_notes text,
  notes text,
  -- Prevents double-deduction/double-restock when update_order_status() runs twice.
  inventory_deducted boolean not null default false,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz,
  cancelled_at timestamptz
);
create index orders_customer_idx on public.orders (customer_id);
create index orders_status_idx on public.orders (status);
create index orders_channel_idx on public.orders (sales_channel);
create index orders_created_at_idx on public.orders (created_at desc);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  product_variant_id uuid not null references public.product_variants (id) on delete restrict,
  product_name_snapshot text not null,
  variant_label_snapshot text not null,
  quantity integer not null check (quantity > 0),
  unit_price numeric(12, 2) not null check (unit_price >= 0),
  unit_cost_snapshot numeric(12, 2) not null default 0 check (unit_cost_snapshot >= 0),
  discount_amount numeric(12, 2) not null default 0 check (discount_amount >= 0),
  line_total numeric(12, 2) not null check (line_total >= 0),
  created_at timestamptz not null default now()
);
create index order_items_order_idx on public.order_items (order_id);
create index order_items_variant_idx on public.order_items (product_variant_id);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  amount numeric(12, 2) not null check (amount > 0),
  method payment_method not null,
  reference_number text,
  paid_at timestamptz not null default now(),
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);
create index payments_order_idx on public.payments (order_id);

create table public.order_status_history (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  status order_status not null,
  note text,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);
create index order_status_history_order_idx on public.order_status_history (order_id);
