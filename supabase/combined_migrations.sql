-- ============================================================
-- FILE: 0001_enums_and_core.sql
-- ============================================================
-- =========================================================================
-- 0001_enums_and_core.sql
-- Extensions, enum types, and core reference tables (profiles, categories,
-- collections, suppliers, customers).
-- =========================================================================

create extension if not exists "pgcrypto";
create extension if not exists "pg_trgm";

-- ---------------------------------------------------------------------
-- Enum types
-- ---------------------------------------------------------------------
create type user_role as enum ('admin', 'manager', 'staff');
create type user_status as enum ('active', 'inactive');

create type product_status as enum ('active', 'draft', 'archived');
create type variant_status as enum ('active', 'inactive');

create type inventory_txn_type as enum (
  'stock_in', 'stock_out', 'sale', 'return', 'damage', 'adjustment', 'transfer'
);

create type payment_status as enum ('unpaid', 'partial', 'paid', 'refunded');
create type payment_method as enum ('cash', 'gcash', 'maya', 'bank_transfer', 'card', 'other');

create type purchase_status as enum ('draft', 'ordered', 'partially_received', 'received', 'cancelled');

create type sales_channel as enum ('pos', 'online');
create type order_status as enum (
  'pending', 'confirmed', 'processing', 'ready', 'completed', 'cancelled', 'refunded'
);
create type discount_type as enum ('fixed', 'percentage');

create type return_reason as enum (
  'wrong_size', 'wrong_color', 'damaged', 'defective', 'change_of_mind', 'other'
);
create type return_status as enum ('requested', 'approved', 'rejected', 'completed');
create type return_action as enum ('refund', 'exchange');

create type expense_category as enum (
  'rent', 'utilities', 'salaries', 'marketing', 'packaging', 'transportation',
  'supplies', 'manufacturing', 'shipping', 'platform_fees', 'other'
);

create type notification_type as enum (
  'low_stock', 'out_of_stock', 'new_order', 'pending_payment', 'return_request'
);

create type entity_status as enum ('active', 'inactive');

-- ---------------------------------------------------------------------
-- profiles: one row per auth.users member, employees only (Admin/Manager/Staff)
-- ---------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null,
  email text not null,
  phone text,
  avatar_url text,
  role user_role not null default 'staff',
  status user_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index profiles_role_idx on public.profiles (role);

-- ---------------------------------------------------------------------
-- categories
-- ---------------------------------------------------------------------
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  status entity_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- collections
-- ---------------------------------------------------------------------
create table public.collections (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  season text,
  status entity_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- suppliers
-- ---------------------------------------------------------------------
create table public.suppliers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  contact_person text,
  phone text,
  email text,
  address text,
  notes text,
  status entity_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- customers
-- total_orders / total_spent / last_purchase_at are maintained by trigger
-- (see 0005_orders.sql) whenever an order is completed.
-- ---------------------------------------------------------------------
create table public.customers (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  phone text,
  email text,
  address text,
  birthday date,
  notes text,
  total_orders integer not null default 0,
  total_spent numeric(12, 2) not null default 0,
  last_purchase_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index customers_full_name_idx on public.customers using gin (full_name gin_trgm_ops);


-- ============================================================
-- FILE: 0002_products.sql
-- ============================================================
-- =========================================================================
-- 0002_products.sql
-- Products, variants, images, and per-product costing.
-- =========================================================================

create table public.products (
  id uuid primary key default gen_random_uuid(),
  sku text not null unique,
  name text not null,
  slug text not null unique,
  description text,
  category_id uuid references public.categories (id) on delete set null,
  collection_id uuid references public.collections (id) on delete set null,
  supplier_id uuid references public.suppliers (id) on delete set null,
  brand text,
  status product_status not null default 'draft',
  cost_price numeric(12, 2) not null default 0 check (cost_price >= 0),
  selling_price numeric(12, 2) not null default 0 check (selling_price >= 0),
  discount_price numeric(12, 2) check (discount_price is null or discount_price >= 0),
  manufacturing_cost numeric(12, 2) not null default 0 check (manufacturing_cost >= 0),
  packaging_cost numeric(12, 2) not null default 0 check (packaging_cost >= 0),
  other_cost numeric(12, 2) not null default 0 check (other_cost >= 0),
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint discount_price_lt_selling check (
    discount_price is null or discount_price <= selling_price
  )
);
create index products_category_idx on public.products (category_id);
create index products_collection_idx on public.products (collection_id);
create index products_supplier_idx on public.products (supplier_id);
create index products_status_idx on public.products (status);
create index products_name_idx on public.products using gin (name gin_trgm_ops);

create table public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  url text not null,
  alt text,
  sort_order integer not null default 0,
  is_primary boolean not null default false,
  created_at timestamptz not null default now()
);
create index product_images_product_idx on public.product_images (product_id);

-- Only one primary image per product.
create unique index product_images_one_primary_idx
  on public.product_images (product_id)
  where is_primary;

create table public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  sku text not null unique,
  size text not null,
  color text not null,
  barcode text unique,
  cost_price numeric(12, 2) not null default 0 check (cost_price >= 0),
  selling_price numeric(12, 2) not null default 0 check (selling_price >= 0),
  reorder_level integer not null default 5 check (reorder_level >= 0),
  status variant_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (product_id, size, color)
);
create index product_variants_product_idx on public.product_variants (product_id);
create index product_variants_status_idx on public.product_variants (status);


-- ============================================================
-- FILE: 0003_inventory.sql
-- ============================================================
-- =========================================================================
-- 0003_inventory.sql
-- One inventory row per variant, plus an append-only transaction ledger.
-- All stock mutations MUST go through public.adjust_inventory() (see
-- 0007_functions.sql) so the ledger and the on-hand counters never drift
-- apart and concurrent sales can't oversell a variant.
-- =========================================================================

create table public.inventory (
  id uuid primary key default gen_random_uuid(),
  product_variant_id uuid not null unique references public.product_variants (id) on delete cascade,
  quantity_on_hand integer not null default 0 check (quantity_on_hand >= 0),
  quantity_reserved integer not null default 0 check (quantity_reserved >= 0),
  quantity_damaged integer not null default 0 check (quantity_damaged >= 0),
  quantity_returned integer not null default 0 check (quantity_returned >= 0),
  quantity_sold integer not null default 0 check (quantity_sold >= 0),
  reorder_level integer not null default 5 check (reorder_level >= 0),
  updated_at timestamptz not null default now(),
  constraint reserved_lte_on_hand check (quantity_reserved <= quantity_on_hand)
);
create index inventory_variant_idx on public.inventory (product_variant_id);

create table public.inventory_transactions (
  id uuid primary key default gen_random_uuid(),
  product_variant_id uuid not null references public.product_variants (id) on delete restrict,
  transaction_type inventory_txn_type not null,
  -- Signed delta applied to quantity_on_hand: positive = increase, negative = decrease.
  quantity integer not null check (quantity <> 0),
  reference_type text,
  reference_id uuid,
  notes text,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);
create index inventory_txn_variant_idx on public.inventory_transactions (product_variant_id);
create index inventory_txn_reference_idx on public.inventory_transactions (reference_type, reference_id);
create index inventory_txn_created_at_idx on public.inventory_transactions (created_at desc);


-- ============================================================
-- FILE: 0004_purchasing.sql
-- ============================================================
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


-- ============================================================
-- FILE: 0005_orders.sql
-- ============================================================
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


-- ============================================================
-- FILE: 0006_returns_expenses_ops.sql
-- ============================================================
-- =========================================================================
-- 0006_returns_expenses_ops.sql
-- Returns/exchanges, expenses, notifications, settings, audit log.
-- =========================================================================

create table public.returns (
  id uuid primary key default gen_random_uuid(),
  return_number text not null unique,
  order_id uuid not null references public.orders (id) on delete restrict,
  customer_id uuid references public.customers (id) on delete set null,
  reason return_reason not null,
  status return_status not null default 'requested',
  refund_amount numeric(12, 2) not null default 0 check (refund_amount >= 0),
  notes text,
  created_by uuid references public.profiles (id) on delete set null,
  resolved_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index returns_order_idx on public.returns (order_id);
create index returns_status_idx on public.returns (status);

create table public.return_items (
  id uuid primary key default gen_random_uuid(),
  return_id uuid not null references public.returns (id) on delete cascade,
  order_item_id uuid not null references public.order_items (id) on delete restrict,
  product_variant_id uuid not null references public.product_variants (id) on delete restrict,
  quantity integer not null check (quantity > 0),
  action return_action not null,
  exchange_variant_id uuid references public.product_variants (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint exchange_needs_target check (
    (action = 'exchange' and exchange_variant_id is not null)
    or (action = 'refund' and exchange_variant_id is null)
  )
);
create index return_items_return_idx on public.return_items (return_id);

create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  category expense_category not null,
  description text not null,
  amount numeric(12, 2) not null check (amount > 0),
  expense_date date not null default current_date,
  payment_method payment_method not null default 'cash',
  receipt_url text,
  notes text,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index expenses_category_idx on public.expenses (category);
create index expenses_date_idx on public.expenses (expense_date desc);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  -- null user_id = broadcast to all admin/manager users (see policy in 0008_rls.sql)
  user_id uuid references public.profiles (id) on delete cascade,
  type notification_type not null,
  title text not null,
  message text not null,
  link text,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);
create index notifications_user_idx on public.notifications (user_id);
create index notifications_unread_idx on public.notifications (user_id, is_read) where not is_read;

create table public.settings (
  id boolean primary key default true,
  business_name text not null default 'SHIFT Clothing',
  logo_url text,
  address text,
  contact_number text,
  email text,
  social_media jsonb not null default '{}'::jsonb,
  currency text not null default 'PHP',
  tax_percentage numeric(5, 2) not null default 0 check (tax_percentage >= 0 and tax_percentage <= 100),
  low_stock_threshold integer not null default 5 check (low_stock_threshold >= 0),
  auto_deduct_on order_status not null default 'completed',
  updated_by uuid references public.profiles (id) on delete set null,
  updated_at timestamptz not null default now(),
  constraint settings_singleton check (id)
);
insert into public.settings (id) values (true);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles (id) on delete set null,
  action text not null,
  module text not null,
  record_id uuid,
  details jsonb,
  created_at timestamptz not null default now()
);
create index audit_logs_module_idx on public.audit_logs (module);
create index audit_logs_record_idx on public.audit_logs (record_id);
create index audit_logs_created_at_idx on public.audit_logs (created_at desc);


-- ============================================================
-- FILE: 0007_functions_core.sql
-- ============================================================
-- =========================================================================
-- 0007_functions_core.sql
-- Role helpers, updated_at trigger, new-user provisioning, sequential
-- document numbering, and a generic audit-log trigger.
-- =========================================================================

-- ---------------------------------------------------------------------
-- Role helpers (SECURITY DEFINER so RLS policies on `profiles` can call
-- them without recursively re-triggering RLS on `profiles` itself).
-- ---------------------------------------------------------------------
create or replace function public.current_role()
returns user_role
language sql
security definer
stable
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin' and status = 'active'
  );
$$;

create or replace function public.is_manager_up()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('admin', 'manager') and status = 'active'
  );
$$;

create or replace function public.is_staff_up()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and status = 'active'
  );
$$;

grant execute on function public.current_role() to authenticated;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.is_manager_up() to authenticated;
grant execute on function public.is_staff_up() to authenticated;

-- ---------------------------------------------------------------------
-- Generic updated_at trigger
-- ---------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare
  t text;
begin
  foreach t in array array[
    'profiles', 'categories', 'collections', 'suppliers', 'customers',
    'products', 'product_variants', 'purchases', 'orders', 'returns', 'expenses'
  ] loop
    execute format(
      'create trigger set_updated_at before update on public.%I
       for each row execute function public.set_updated_at()', t
    );
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- New auth user -> profile row. First user ever becomes admin;
-- everyone after defaults to staff (an admin promotes them later).
-- ---------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role user_role;
begin
  select case when exists (select 1 from public.profiles) then 'staff' else 'admin' end::user_role
  into v_role;

  insert into public.profiles (id, full_name, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    new.email,
    v_role
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------
-- Sequential document numbering (ORD-2026-000001, PO-2026-000001, ...)
-- Atomic under concurrency via INSERT ... ON CONFLICT row locking.
-- ---------------------------------------------------------------------
create table public.numbering_sequences (
  key text primary key,
  next_value integer not null default 1
);

create or replace function public.next_document_number(p_prefix text, p_pad integer default 6)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_key text := p_prefix || '-' || to_char(now(), 'YYYY');
  v_value integer;
begin
  insert into public.numbering_sequences (key, next_value)
  values (v_key, 2)
  on conflict (key) do update set next_value = public.numbering_sequences.next_value + 1
  returning next_value - 1 into v_value;

  return upper(p_prefix) || '-' || to_char(now(), 'YYYY') || '-' || lpad(v_value::text, p_pad, '0');
end;
$$;

-- ---------------------------------------------------------------------
-- Generic audit log trigger for simple CRUD tables (products, expenses,
-- profiles). High-value business operations (orders, inventory, returns)
-- log explicitly from their own RPC functions with richer detail.
-- ---------------------------------------------------------------------
create or replace function public.log_audit_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_record_id uuid;
  v_action text;
begin
  v_record_id := coalesce(new.id, old.id);
  v_action := lower(tg_table_name) || '_' || lower(tg_op);

  insert into public.audit_logs (user_id, action, module, record_id, details)
  values (
    auth.uid(),
    v_action,
    tg_table_name,
    v_record_id,
    case tg_op
      when 'DELETE' then to_jsonb(old)
      else to_jsonb(new)
    end
  );

  return coalesce(new, old);
end;
$$;

do $$
declare
  t text;
begin
  foreach t in array array['products', 'expenses', 'profiles'] loop
    execute format(
      'create trigger log_audit after insert or update or delete on public.%I
       for each row execute function public.log_audit_event()', t
    );
  end loop;
end $$;


-- ============================================================
-- FILE: 0008_functions_business.sql
-- ============================================================
-- =========================================================================
-- 0008_functions_business.sql
-- Atomic business operations: inventory ledger, order creation & status
-- transitions, purchase receiving, returns/exchanges, low-stock alerts.
--
-- SECURITY MODEL: public.adjust_inventory() is SECURITY DEFINER and
-- bypasses RLS, so EXECUTE is revoked from all client roles. It is only
-- reachable through the public-facing wrapper functions below, each of
-- which performs its own role check with is_staff_up()/is_manager_up()
-- before touching data. Never grant EXECUTE on adjust_inventory directly.
-- =========================================================================

create or replace function public.adjust_inventory(
  p_variant_id uuid,
  p_type inventory_txn_type,
  p_quantity integer,
  p_reference_type text default null,
  p_reference_id uuid default null,
  p_notes text default null,
  p_created_by uuid default null
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_on_hand integer;
begin
  if p_quantity = 0 then
    raise exception 'adjust_inventory: quantity delta cannot be zero';
  end if;

  insert into public.inventory (product_variant_id)
  values (p_variant_id)
  on conflict (product_variant_id) do nothing;

  select quantity_on_hand into v_on_hand
  from public.inventory
  where product_variant_id = p_variant_id
  for update;

  if v_on_hand + p_quantity < 0 then
    raise exception 'Insufficient stock: on hand %, requested change %', v_on_hand, p_quantity
      using errcode = 'P0001';
  end if;

  update public.inventory
  set
    quantity_on_hand = quantity_on_hand + p_quantity,
    quantity_sold = quantity_sold + case when p_type = 'sale' and p_quantity < 0 then -p_quantity else 0 end,
    quantity_damaged = quantity_damaged + case when p_type = 'damage' and p_quantity < 0 then -p_quantity else 0 end,
    quantity_returned = quantity_returned + case when p_type = 'return' and p_quantity > 0 then p_quantity else 0 end,
    updated_at = now()
  where product_variant_id = p_variant_id;

  insert into public.inventory_transactions (
    product_variant_id, transaction_type, quantity, reference_type, reference_id, notes, created_by
  ) values (
    p_variant_id, p_type, p_quantity, p_reference_type, p_reference_id, p_notes, p_created_by
  );
end;
$$;
revoke all on function public.adjust_inventory(uuid, inventory_txn_type, integer, text, uuid, text, uuid) from public;

-- Manual stock movements (Stock In / Adjustment / Damage / Transfer) from the
-- Inventory UI. Manager/Admin only — sales go through create_order() instead.
create or replace function public.record_manual_stock_movement(
  p_variant_id uuid,
  p_type inventory_txn_type,
  p_quantity integer,
  p_notes text default null
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_manager_up() then
    raise exception 'Only managers or admins can record stock movements';
  end if;
  if p_type not in ('stock_in', 'stock_out', 'adjustment', 'damage', 'transfer') then
    raise exception 'Unsupported movement type for manual entry: %', p_type;
  end if;

  perform public.adjust_inventory(p_variant_id, p_type, p_quantity, 'manual', null, p_notes, auth.uid());
end;
$$;
grant execute on function public.record_manual_stock_movement(uuid, inventory_txn_type, integer, text) to authenticated;

-- ---------------------------------------------------------------------
-- Customer lifetime-stats maintenance
-- ---------------------------------------------------------------------
create or replace function public.handle_order_completion()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.customer_id is not null
     and new.status = 'completed'
     and (tg_op = 'INSERT' or old.status is distinct from 'completed') then
    update public.customers
    set total_orders = total_orders + 1,
        total_spent = total_spent + new.total_amount,
        last_purchase_at = now()
    where id = new.customer_id;
  elsif new.customer_id is not null
     and new.status in ('cancelled', 'refunded')
     and tg_op = 'UPDATE' and old.status = 'completed' then
    update public.customers
    set total_orders = greatest(total_orders - 1, 0),
        total_spent = greatest(total_spent - new.total_amount, 0)
    where id = new.customer_id;
  end if;
  return new;
end;
$$;

create trigger on_order_completion
  after insert or update of status on public.orders
  for each row execute function public.handle_order_completion();

-- ---------------------------------------------------------------------
-- create_order: the single, atomic entry point for both POS and online
-- checkout. All pricing/discount/tax math happens here, server-side.
-- p_items shape: [{ "variant_id": uuid, "quantity": int }]
-- ---------------------------------------------------------------------
create or replace function public.create_order(
  p_customer_id uuid,
  p_sales_channel sales_channel,
  p_items jsonb,
  p_payment_method payment_method default null,
  p_discount_type discount_type default null,
  p_discount_value numeric default 0,
  p_promo_code text default null,
  p_shipping_amount numeric default 0,
  p_shipping_address text default null,
  p_shipping_notes text default null,
  p_amount_paid numeric default 0,
  p_notes text default null
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order_id uuid := gen_random_uuid();
  v_item jsonb;
  v_variant record;
  v_qty integer;
  v_unit_price numeric;
  v_line_total numeric;
  v_subtotal numeric := 0;
  v_discount_amount numeric := 0;
  v_tax_pct numeric;
  v_tax_amount numeric := 0;
  v_total numeric := 0;
  v_promo record;
  v_status order_status;
  v_payment_status payment_status;
  v_change numeric := 0;
  v_order_number text;
  v_auto_deduct order_status;
begin
  if not public.is_staff_up() then
    raise exception 'Not authorized to create orders';
  end if;
  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'An order requires at least one item';
  end if;

  select tax_percentage, auto_deduct_on into v_tax_pct, v_auto_deduct from public.settings where id = true;

  -- Pass 1: lock variants, validate, price server-side, accumulate subtotal.
  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_qty := (v_item ->> 'quantity')::integer;
    if v_qty is null or v_qty <= 0 then
      raise exception 'Invalid quantity for order item';
    end if;

    select pv.id, pv.selling_price, pv.cost_price, pv.status, p.name as product_name,
           pv.size, pv.color
    into v_variant
    from public.product_variants pv
    join public.products p on p.id = pv.product_id
    where pv.id = (v_item ->> 'variant_id')::uuid
    for update of pv;

    if v_variant.id is null then
      raise exception 'Product variant % not found', (v_item ->> 'variant_id');
    end if;
    if v_variant.status <> 'active' then
      raise exception '% (%/%) is not available for sale', v_variant.product_name, v_variant.size, v_variant.color;
    end if;

    v_subtotal := v_subtotal + (v_variant.selling_price * v_qty);
  end loop;

  -- Resolve discount: promo code takes precedence over a manual discount.
  if p_promo_code is not null then
    select * into v_promo from public.promo_codes
    where code = upper(p_promo_code) and status = 'active'
      and (starts_at is null or starts_at <= now())
      and (ends_at is null or ends_at >= now())
    for update;

    if v_promo.id is null then
      raise exception 'Promo code % is invalid or expired', p_promo_code;
    end if;
    if v_promo.usage_limit is not null and v_promo.usage_count >= v_promo.usage_limit then
      raise exception 'Promo code % has reached its usage limit', p_promo_code;
    end if;
    if v_subtotal < v_promo.min_order_amount then
      raise exception 'Order does not meet the minimum amount for promo code %', p_promo_code;
    end if;

    v_discount_amount := case
      when v_promo.type = 'percentage' then v_subtotal * v_promo.value / 100
      else v_promo.value
    end;
    if v_promo.max_discount_amount is not null then
      v_discount_amount := least(v_discount_amount, v_promo.max_discount_amount);
    end if;

    update public.promo_codes set usage_count = usage_count + 1 where id = v_promo.id;
  elsif p_discount_type is not null and p_discount_value > 0 then
    v_discount_amount := case
      when p_discount_type = 'percentage' then v_subtotal * least(p_discount_value, 100) / 100
      else p_discount_value
    end;
  end if;

  v_discount_amount := least(v_discount_amount, v_subtotal);
  v_tax_amount := round((v_subtotal - v_discount_amount) * coalesce(v_tax_pct, 0) / 100, 2);
  v_total := v_subtotal - v_discount_amount + v_tax_amount + coalesce(p_shipping_amount, 0);

  v_change := greatest(coalesce(p_amount_paid, 0) - v_total, 0);
  v_payment_status := case
    when coalesce(p_amount_paid, 0) >= v_total and v_total > 0 then 'paid'
    when coalesce(p_amount_paid, 0) > 0 then 'partial'
    else 'unpaid'
  end;

  v_status := case when p_sales_channel = 'pos' and v_payment_status = 'paid' then 'completed' else 'pending' end;
  v_order_number := public.next_document_number('ORD');

  insert into public.orders (
    id, order_number, customer_id, sales_channel, status, payment_status, payment_method,
    promo_code_id, discount_type, discount_value, discount_amount, subtotal, tax_amount,
    shipping_amount, total_amount, amount_paid, change_amount, shipping_address, shipping_notes,
    notes, created_by, completed_at, inventory_deducted
  ) values (
    v_order_id, v_order_number, p_customer_id, p_sales_channel, v_status, v_payment_status, p_payment_method,
    v_promo.id, coalesce(case when p_promo_code is not null then v_promo.type else p_discount_type end, null),
    coalesce(case when p_promo_code is not null then v_promo.value else p_discount_value end, 0), v_discount_amount,
    v_subtotal, v_tax_amount, coalesce(p_shipping_amount, 0), v_total, coalesce(p_amount_paid, 0), v_change,
    p_shipping_address, p_shipping_notes, p_notes, auth.uid(),
    case when v_status = 'completed' then now() else null end,
    v_status = v_auto_deduct
  );

  -- Pass 2: create line items (re-reading priced values) and deduct stock if applicable.
  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_qty := (v_item ->> 'quantity')::integer;

    select pv.id, pv.selling_price, pv.cost_price, p.name as product_name, pv.size, pv.color
    into v_variant
    from public.product_variants pv
    join public.products p on p.id = pv.product_id
    where pv.id = (v_item ->> 'variant_id')::uuid;

    v_unit_price := v_variant.selling_price;
    v_line_total := round(v_unit_price * v_qty * (1 - (case when v_subtotal > 0 then v_discount_amount / v_subtotal else 0 end)), 2);

    insert into public.order_items (
      order_id, product_variant_id, product_name_snapshot, variant_label_snapshot,
      quantity, unit_price, unit_cost_snapshot, discount_amount, line_total
    ) values (
      v_order_id, v_variant.id, v_variant.product_name, v_variant.size || ' / ' || v_variant.color,
      v_qty, v_unit_price, v_variant.cost_price, (v_unit_price * v_qty) - v_line_total, v_line_total
    );

    if v_status = v_auto_deduct then
      perform public.adjust_inventory(
        v_variant.id, 'sale', -v_qty, 'order', v_order_id, 'Order ' || v_order_number, auth.uid()
      );
    end if;
  end loop;

  if coalesce(p_amount_paid, 0) > 0 then
    insert into public.payments (order_id, amount, method, created_by)
    values (v_order_id, p_amount_paid, coalesce(p_payment_method, 'cash'), auth.uid());
  end if;

  insert into public.order_status_history (order_id, status, note, created_by)
  values (v_order_id, v_status, 'Order created', auth.uid());

  if p_sales_channel = 'online' then
    insert into public.notifications (type, title, message, link)
    values (
      'new_order', 'New online order',
      v_order_number || ' — ' || to_char(v_total, 'FM999,999,990.00'),
      '/sales/orders/' || v_order_id
    );
  end if;
  if v_payment_status in ('unpaid', 'partial') then
    insert into public.notifications (type, title, message, link)
    values ('pending_payment', 'Payment pending', v_order_number || ' is ' || v_payment_status, '/sales/orders/' || v_order_id);
  end if;

  insert into public.audit_logs (user_id, action, module, record_id, details)
  values (auth.uid(), 'order_created', 'orders', v_order_id,
          jsonb_build_object('order_number', v_order_number, 'total_amount', v_total));

  return v_order_id;
end;
$$;
grant execute on function public.create_order(
  uuid, sales_channel, jsonb, payment_method, discount_type, numeric, text, numeric, text, text, numeric, text
) to authenticated;

-- ---------------------------------------------------------------------
-- update_order_status: drives the online-order timeline, deducting or
-- restocking inventory exactly once as the order crosses the configured
-- auto-deduct status.
-- ---------------------------------------------------------------------
create or replace function public.update_order_status(
  p_order_id uuid,
  p_new_status order_status,
  p_note text default null
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order record;
  v_item record;
  v_auto_deduct order_status;
begin
  if not public.is_staff_up() then
    raise exception 'Not authorized to update orders';
  end if;
  if p_new_status = 'refunded' and not public.is_manager_up() then
    raise exception 'Only managers or admins can mark an order as refunded';
  end if;

  select * into v_order from public.orders where id = p_order_id for update;
  if v_order.id is null then
    raise exception 'Order not found';
  end if;

  select auto_deduct_on into v_auto_deduct from public.settings where id = true;

  if p_new_status = v_auto_deduct and not v_order.inventory_deducted then
    for v_item in select * from public.order_items where order_id = p_order_id loop
      perform public.adjust_inventory(
        v_item.product_variant_id, 'sale', -v_item.quantity, 'order', p_order_id,
        'Order ' || v_order.order_number, auth.uid()
      );
    end loop;
    update public.orders set inventory_deducted = true where id = p_order_id;
  elsif p_new_status in ('cancelled', 'refunded') and v_order.inventory_deducted then
    for v_item in select * from public.order_items where order_id = p_order_id loop
      perform public.adjust_inventory(
        v_item.product_variant_id, 'adjustment', v_item.quantity, 'order_reversal', p_order_id,
        'Reversal for ' || v_order.order_number, auth.uid()
      );
    end loop;
    update public.orders set inventory_deducted = false where id = p_order_id;
  end if;

  update public.orders
  set status = p_new_status,
      completed_at = case when p_new_status = 'completed' then now() else completed_at end,
      cancelled_at = case when p_new_status in ('cancelled', 'refunded') then now() else cancelled_at end
  where id = p_order_id;

  insert into public.order_status_history (order_id, status, note, created_by)
  values (p_order_id, p_new_status, p_note, auth.uid());

  insert into public.audit_logs (user_id, action, module, record_id, details)
  values (auth.uid(), 'order_status_changed', 'orders', p_order_id,
          jsonb_build_object('from', v_order.status, 'to', p_new_status));
end;
$$;
grant execute on function public.update_order_status(uuid, order_status, text) to authenticated;

-- ---------------------------------------------------------------------
-- Purchasing: receive stock against a purchase order.
-- ---------------------------------------------------------------------
create or replace function public.receive_purchase_item(
  p_purchase_item_id uuid,
  p_quantity integer
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item record;
  v_purchase record;
  v_remaining_unreceived integer;
begin
  if not public.is_manager_up() then
    raise exception 'Only managers or admins can receive purchases';
  end if;
  if p_quantity <= 0 then
    raise exception 'Received quantity must be positive';
  end if;

  select * into v_item from public.purchase_items where id = p_purchase_item_id for update;
  if v_item.id is null then
    raise exception 'Purchase item not found';
  end if;
  if v_item.quantity_received + p_quantity > v_item.quantity then
    raise exception 'Cannot receive more than the ordered quantity';
  end if;

  update public.purchase_items
  set quantity_received = quantity_received + p_quantity
  where id = p_purchase_item_id;

  select * into v_purchase from public.purchases where id = v_item.purchase_id for update;

  perform public.adjust_inventory(
    v_item.product_variant_id, 'stock_in', p_quantity, 'purchase', v_purchase.id,
    'Receipt against ' || v_purchase.purchase_number, auth.uid()
  );

  select count(*) into v_remaining_unreceived
  from public.purchase_items
  where purchase_id = v_purchase.id and quantity_received < quantity;

  update public.purchases
  set status = case when v_remaining_unreceived = 0 then 'received' else 'partially_received' end,
      received_at = case when v_remaining_unreceived = 0 then now() else received_at end
  where id = v_purchase.id;

  insert into public.audit_logs (user_id, action, module, record_id, details)
  values (auth.uid(), 'purchase_item_received', 'purchases', v_purchase.id,
          jsonb_build_object('purchase_item_id', p_purchase_item_id, 'quantity', p_quantity));
end;
$$;
grant execute on function public.receive_purchase_item(uuid, integer) to authenticated;

-- ---------------------------------------------------------------------
-- Returns & exchanges
-- ---------------------------------------------------------------------
create or replace function public.create_return_request(
  p_order_id uuid,
  p_reason return_reason,
  p_items jsonb,
  p_notes text default null
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_return_id uuid := gen_random_uuid();
  v_order record;
  v_item jsonb;
  v_return_number text;
begin
  if not public.is_staff_up() then
    raise exception 'Not authorized to create return requests';
  end if;
  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'A return requires at least one item';
  end if;

  select * into v_order from public.orders where id = p_order_id;
  if v_order.id is null then
    raise exception 'Order not found';
  end if;

  v_return_number := public.next_document_number('RET');

  insert into public.returns (id, return_number, order_id, customer_id, reason, notes, created_by)
  values (v_return_id, v_return_number, p_order_id, v_order.customer_id, p_reason, p_notes, auth.uid());

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    insert into public.return_items (
      return_id, order_item_id, product_variant_id, quantity, action, exchange_variant_id
    ) values (
      v_return_id,
      (v_item ->> 'order_item_id')::uuid,
      (v_item ->> 'product_variant_id')::uuid,
      (v_item ->> 'quantity')::integer,
      (v_item ->> 'action')::return_action,
      nullif(v_item ->> 'exchange_variant_id', '')::uuid
    );
  end loop;

  insert into public.notifications (type, title, message, link)
  values ('return_request', 'New return request', v_return_number || ' needs review', '/sales/returns/' || v_return_id);

  insert into public.audit_logs (user_id, action, module, record_id, details)
  values (auth.uid(), 'return_requested', 'returns', v_return_id, jsonb_build_object('order_id', p_order_id));

  return v_return_id;
end;
$$;
grant execute on function public.create_return_request(uuid, return_reason, jsonb, text) to authenticated;

create or replace function public.resolve_return(
  p_return_id uuid,
  p_new_status return_status
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_return record;
  v_item record;
  v_refund_total numeric := 0;
begin
  if not public.is_manager_up() then
    raise exception 'Only managers or admins can resolve returns';
  end if;

  select * into v_return from public.returns where id = p_return_id for update;
  if v_return.id is null then
    raise exception 'Return not found';
  end if;
  if v_return.status = 'completed' then
    raise exception 'This return has already been completed';
  end if;

  if p_new_status = 'completed' then
    for v_item in select * from public.return_items where return_id = p_return_id
    loop
      perform public.adjust_inventory(
        v_item.product_variant_id, 'return', v_item.quantity, 'return', p_return_id,
        'Return ' || v_return.return_number, auth.uid()
      );

      if v_item.action = 'exchange' then
        perform public.adjust_inventory(
          v_item.exchange_variant_id, 'sale', -v_item.quantity, 'return_exchange', p_return_id,
          'Exchange for ' || v_return.return_number, auth.uid()
        );
      else
        select v_refund_total + (oi.unit_price * v_item.quantity) into v_refund_total
        from public.order_items oi where oi.id = v_item.order_item_id;
      end if;
    end loop;

    update public.returns
    set status = 'completed', refund_amount = v_refund_total, resolved_by = auth.uid()
    where id = p_return_id;
  else
    update public.returns
    set status = p_new_status, resolved_by = auth.uid()
    where id = p_return_id;
  end if;

  insert into public.audit_logs (user_id, action, module, record_id, details)
  values (auth.uid(), 'return_' || p_new_status, 'returns', p_return_id, '{}'::jsonb);
end;
$$;
grant execute on function public.resolve_return(uuid, return_status) to authenticated;

-- ---------------------------------------------------------------------
-- Low stock / out of stock notifications, fired whenever on-hand changes.
-- ---------------------------------------------------------------------
create or replace function public.notify_stock_levels()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_product_name text;
  v_variant_label text;
begin
  if new.quantity_on_hand <= new.reorder_level and
     (old.quantity_on_hand is null or old.quantity_on_hand > new.reorder_level) then

    select p.name, pv.size || ' / ' || pv.color
    into v_product_name, v_variant_label
    from public.product_variants pv
    join public.products p on p.id = pv.product_id
    where pv.id = new.product_variant_id;

    insert into public.notifications (type, title, message, link)
    values (
      case when new.quantity_on_hand = 0 then 'out_of_stock' else 'low_stock' end,
      case when new.quantity_on_hand = 0 then 'Out of stock' else 'Low stock' end,
      v_product_name || ' (' || v_variant_label || ') — ' || new.quantity_on_hand || ' left',
      '/inventory'
    );
  end if;
  return new;
end;
$$;

create trigger on_inventory_change
  after update of quantity_on_hand on public.inventory
  for each row execute function public.notify_stock_levels();


-- ============================================================
-- FILE: 0009_rls.sql
-- ============================================================
-- =========================================================================
-- 0009_rls.sql
-- Row Level Security for every table. Nothing is left world-writable:
-- high-value mutations (inventory, orders, returns, purchases receiving)
-- have NO client-facing INSERT/UPDATE policy at all — they are only
-- reachable through the SECURITY DEFINER RPCs in 0008, which perform
-- their own role checks. Everything else uses is_staff_up()/
-- is_manager_up()/is_admin() from 0007.
-- =========================================================================

alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.collections enable row level security;
alter table public.suppliers enable row level security;
alter table public.customers enable row level security;
alter table public.products enable row level security;
alter table public.product_images enable row level security;
alter table public.product_variants enable row level security;
alter table public.inventory enable row level security;
alter table public.inventory_transactions enable row level security;
alter table public.purchases enable row level security;
alter table public.purchase_items enable row level security;
alter table public.promo_codes enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.payments enable row level security;
alter table public.order_status_history enable row level security;
alter table public.returns enable row level security;
alter table public.return_items enable row level security;
alter table public.expenses enable row level security;
alter table public.notifications enable row level security;
alter table public.settings enable row level security;
alter table public.audit_logs enable row level security;
alter table public.numbering_sequences enable row level security;

-- ---------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------
create or replace function public.prevent_role_self_escalation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- auth.uid() is null for trusted server-side calls made with the service-role
  -- key (e.g. the admin user-management screen) — those bypass RLS already and
  -- are gated in the application layer instead, so only block *user-session*
  -- (JWT-bearing) requests that aren't admins.
  if auth.uid() is not null and not public.is_admin() and (new.role <> old.role or new.status <> old.status) then
    raise exception 'Only an admin can change a user''s role or status';
  end if;
  return new;
end;
$$;

create trigger prevent_role_self_escalation
  before update on public.profiles
  for each row execute function public.prevent_role_self_escalation();

create policy profiles_select on public.profiles for select to authenticated using (true);
create policy profiles_update on public.profiles for update to authenticated
  using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());
create policy profiles_delete on public.profiles for delete to authenticated using (public.is_admin());

-- ---------------------------------------------------------------------
-- Reference data: categories, collections, suppliers
-- ---------------------------------------------------------------------
create policy categories_select on public.categories for select to authenticated using (public.is_staff_up());
create policy categories_write on public.categories for all to authenticated
  using (public.is_manager_up()) with check (public.is_manager_up());

create policy collections_select on public.collections for select to authenticated using (public.is_staff_up());
create policy collections_write on public.collections for all to authenticated
  using (public.is_manager_up()) with check (public.is_manager_up());

create policy suppliers_select on public.suppliers for select to authenticated using (public.is_staff_up());
create policy suppliers_write on public.suppliers for all to authenticated
  using (public.is_manager_up()) with check (public.is_manager_up());

-- ---------------------------------------------------------------------
-- customers — staff can manage, everyone can view
-- ---------------------------------------------------------------------
create policy customers_select on public.customers for select to authenticated using (public.is_staff_up());
create policy customers_insert on public.customers for insert to authenticated with check (public.is_staff_up());
create policy customers_update on public.customers for update to authenticated
  using (public.is_staff_up()) with check (public.is_staff_up());
create policy customers_delete on public.customers for delete to authenticated using (public.is_manager_up());

-- ---------------------------------------------------------------------
-- products, images, variants — staff view only, manager/admin manage
-- ---------------------------------------------------------------------
create policy products_select on public.products for select to authenticated using (public.is_staff_up());
create policy products_write on public.products for all to authenticated
  using (public.is_manager_up()) with check (public.is_manager_up());

create policy product_images_select on public.product_images for select to authenticated using (public.is_staff_up());
create policy product_images_write on public.product_images for all to authenticated
  using (public.is_manager_up()) with check (public.is_manager_up());

create policy product_variants_select on public.product_variants for select to authenticated using (public.is_staff_up());
create policy product_variants_write on public.product_variants for all to authenticated
  using (public.is_manager_up()) with check (public.is_manager_up());

-- ---------------------------------------------------------------------
-- inventory & its ledger — read-only to clients; all writes happen via
-- adjust_inventory()/record_manual_stock_movement() (SECURITY DEFINER).
-- ---------------------------------------------------------------------
create policy inventory_select on public.inventory for select to authenticated using (public.is_staff_up());
create policy inventory_txn_select on public.inventory_transactions for select to authenticated using (public.is_staff_up());

-- ---------------------------------------------------------------------
-- purchasing — manager/admin only end to end
-- ---------------------------------------------------------------------
create policy purchases_select on public.purchases for select to authenticated using (public.is_manager_up());
create policy purchases_write on public.purchases for insert to authenticated with check (public.is_manager_up());
create policy purchases_update on public.purchases for update to authenticated
  using (public.is_manager_up()) with check (public.is_manager_up());

create policy purchase_items_select on public.purchase_items for select to authenticated using (public.is_manager_up());
create policy purchase_items_insert on public.purchase_items for insert to authenticated with check (public.is_manager_up());
-- Receiving (quantity_received) is only mutated via receive_purchase_item(); no update policy here.

-- ---------------------------------------------------------------------
-- promo codes — manager/admin manage, staff can read to validate at POS
-- ---------------------------------------------------------------------
create policy promo_codes_select on public.promo_codes for select to authenticated using (public.is_staff_up());
create policy promo_codes_write on public.promo_codes for all to authenticated
  using (public.is_manager_up()) with check (public.is_manager_up());

-- ---------------------------------------------------------------------
-- orders — visible to any employee; all writes go through create_order()/
-- update_order_status() (SECURITY DEFINER). No client INSERT/UPDATE.
-- ---------------------------------------------------------------------
create policy orders_select on public.orders for select to authenticated using (public.is_staff_up());
create policy order_items_select on public.order_items for select to authenticated using (public.is_staff_up());
create policy payments_select on public.payments for select to authenticated using (public.is_staff_up());
create policy order_status_history_select on public.order_status_history for select to authenticated using (public.is_staff_up());

-- ---------------------------------------------------------------------
-- returns — staff can view/create requests, manager/admin resolve them
-- (writes happen via create_return_request()/resolve_return()).
-- ---------------------------------------------------------------------
create policy returns_select on public.returns for select to authenticated using (public.is_staff_up());
create policy return_items_select on public.return_items for select to authenticated using (public.is_staff_up());

-- ---------------------------------------------------------------------
-- expenses — manager/admin only (staff has no financial visibility)
-- ---------------------------------------------------------------------
create policy expenses_select on public.expenses for select to authenticated using (public.is_manager_up());
create policy expenses_write on public.expenses for all to authenticated
  using (public.is_manager_up()) with check (public.is_manager_up());

-- ---------------------------------------------------------------------
-- notifications
-- ---------------------------------------------------------------------
create policy notifications_select on public.notifications for select to authenticated
  using (user_id = auth.uid() or (user_id is null and public.is_manager_up()));
create policy notifications_update on public.notifications for update to authenticated
  using (user_id = auth.uid() or (user_id is null and public.is_manager_up()))
  with check (user_id = auth.uid() or (user_id is null and public.is_manager_up()));

-- ---------------------------------------------------------------------
-- settings — every employee can read (POS needs tax/currency), admin writes
-- ---------------------------------------------------------------------
create policy settings_select on public.settings for select to authenticated using (public.is_staff_up());
create policy settings_update on public.settings for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------
-- audit_logs — admin only
-- ---------------------------------------------------------------------
create policy audit_logs_select on public.audit_logs for select to authenticated using (public.is_admin());

-- numbering_sequences is purely internal bookkeeping for next_document_number();
-- no client policy is defined, so it is inaccessible to every client role.


-- ============================================================
-- FILE: 0010_storage.sql
-- ============================================================
-- =========================================================================
-- 0010_storage.sql
-- Storage buckets for product images, the business logo, and expense
-- receipts, with matching RLS policies on storage.objects.
-- =========================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('product-images', 'product-images', true, 5242880, array['image/png', 'image/jpeg', 'image/webp', 'image/avif']),
  ('business-logo', 'business-logo', true, 2097152, array['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']),
  ('expense-receipts', 'expense-receipts', false, 10485760, array['image/png', 'image/jpeg', 'image/webp', 'application/pdf'])
on conflict (id) do nothing;

-- product-images: public read, manager/admin write
create policy product_images_public_read on storage.objects for select
  using (bucket_id = 'product-images');
create policy product_images_manager_write on storage.objects for insert to authenticated
  with check (bucket_id = 'product-images' and public.is_manager_up());
create policy product_images_manager_update on storage.objects for update to authenticated
  using (bucket_id = 'product-images' and public.is_manager_up())
  with check (bucket_id = 'product-images' and public.is_manager_up());
create policy product_images_manager_delete on storage.objects for delete to authenticated
  using (bucket_id = 'product-images' and public.is_manager_up());

-- business-logo: public read, admin write
create policy business_logo_public_read on storage.objects for select
  using (bucket_id = 'business-logo');
create policy business_logo_admin_write on storage.objects for insert to authenticated
  with check (bucket_id = 'business-logo' and public.is_admin());
create policy business_logo_admin_update on storage.objects for update to authenticated
  using (bucket_id = 'business-logo' and public.is_admin())
  with check (bucket_id = 'business-logo' and public.is_admin());
create policy business_logo_admin_delete on storage.objects for delete to authenticated
  using (bucket_id = 'business-logo' and public.is_admin());

-- expense-receipts: private, manager/admin only (matches expenses table access)
create policy expense_receipts_manager_read on storage.objects for select to authenticated
  using (bucket_id = 'expense-receipts' and public.is_manager_up());
create policy expense_receipts_manager_write on storage.objects for insert to authenticated
  with check (bucket_id = 'expense-receipts' and public.is_manager_up());
create policy expense_receipts_manager_update on storage.objects for update to authenticated
  using (bucket_id = 'expense-receipts' and public.is_manager_up())
  with check (bucket_id = 'expense-receipts' and public.is_manager_up());
create policy expense_receipts_manager_delete on storage.objects for delete to authenticated
  using (bucket_id = 'expense-receipts' and public.is_manager_up());


-- ============================================================
-- FILE: 0011_login_audit.sql
-- ============================================================
-- =========================================================================
-- 0011_login_audit.sql
-- Auth events (sign-in) never touch our schema directly, so the app calls
-- this RPC right after a successful Supabase Auth login to record it.
-- =========================================================================

create or replace function public.log_login()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.audit_logs (user_id, action, module, record_id, details)
  values (auth.uid(), 'login', 'auth', auth.uid(), '{}'::jsonb);
end;
$$;
grant execute on function public.log_login() to authenticated;


-- ============================================================
-- FILE: 0012_dashboard_functions.sql
-- ============================================================
-- =========================================================================
-- 0012_dashboard_functions.sql
-- Read-only aggregation RPCs for the dashboard and reports. Deliberately
-- SECURITY INVOKER (the default) so RLS on orders/expenses/inventory still
-- applies with the caller's own permissions — these are just faster,
-- index-friendly ways to run the aggregates than pulling raw rows to JS.
-- =========================================================================

create or replace function public.get_dashboard_summary()
returns jsonb
language plpgsql
stable
set search_path = public
as $$
declare
  v jsonb;
begin
  select jsonb_build_object(
    'todays_sales', coalesce((
      select sum(total_amount) from public.orders
      where status = 'completed' and created_at::date = current_date
    ), 0),
    'todays_orders', coalesce((
      select count(*) from public.orders where created_at::date = current_date
    ), 0),
    'total_revenue', coalesce((select sum(total_amount) from public.orders where status = 'completed'), 0),
    'total_cogs', coalesce((
      select sum(oi.unit_cost_snapshot * oi.quantity)
      from public.order_items oi join public.orders o on o.id = oi.order_id
      where o.status = 'completed'
    ), 0),
    'total_expenses', coalesce((select sum(amount) from public.expenses), 0),
    'products_sold_today', coalesce((
      select sum(oi.quantity)
      from public.order_items oi join public.orders o on o.id = oi.order_id
      where o.status = 'completed' and o.created_at::date = current_date
    ), 0),
    'low_stock_count', (
      select count(*) from public.inventory where quantity_on_hand > 0 and quantity_on_hand <= reorder_level
    ),
    'out_of_stock_count', (select count(*) from public.inventory where quantity_on_hand = 0),
    'pending_orders', (
      select count(*) from public.orders where status in ('pending', 'confirmed', 'processing', 'ready')
    ),
    'completed_orders', (select count(*) from public.orders where status = 'completed')
  ) into v;
  return v;
end;
$$;
grant execute on function public.get_dashboard_summary() to authenticated;

create or replace function public.get_sales_series(p_granularity text default 'daily', p_days integer default 30)
returns table (bucket date, revenue numeric, orders_count bigint)
language sql
stable
set search_path = public
as $$
  select
    date_trunc(
      case p_granularity when 'weekly' then 'week' when 'monthly' then 'month' when 'yearly' then 'year' else 'day' end,
      o.created_at
    )::date as bucket,
    sum(o.total_amount) as revenue,
    count(*) as orders_count
  from public.orders o
  where o.status = 'completed' and o.created_at >= now() - (p_days || ' days')::interval
  group by bucket
  order by bucket;
$$;
grant execute on function public.get_sales_series(text, integer) to authenticated;

create or replace function public.get_top_products(p_limit integer default 5, p_days integer default 30)
returns table (product_name text, units_sold bigint, revenue numeric)
language sql
stable
set search_path = public
as $$
  select oi.product_name_snapshot, sum(oi.quantity), sum(oi.line_total)
  from public.order_items oi
  join public.orders o on o.id = oi.order_id
  where o.status = 'completed' and o.created_at >= now() - (p_days || ' days')::interval
  group by oi.product_name_snapshot
  order by sum(oi.line_total) desc
  limit p_limit;
$$;
grant execute on function public.get_top_products(integer, integer) to authenticated;

create or replace function public.get_sales_by_category(p_days integer default 30)
returns table (category_name text, revenue numeric)
language sql
stable
set search_path = public
as $$
  select coalesce(c.name, 'Uncategorized'), sum(oi.line_total)
  from public.order_items oi
  join public.orders o on o.id = oi.order_id
  join public.product_variants pv on pv.id = oi.product_variant_id
  join public.products p on p.id = pv.product_id
  left join public.categories c on c.id = p.category_id
  where o.status = 'completed' and o.created_at >= now() - (p_days || ' days')::interval
  group by c.name
  order by sum(oi.line_total) desc;
$$;
grant execute on function public.get_sales_by_category(integer) to authenticated;

-- ---------------------------------------------------------------------
-- Profit & Loss for an arbitrary date range (spec section 13).
-- ---------------------------------------------------------------------
create or replace function public.get_profit_and_loss(p_from date, p_to date)
returns jsonb
language plpgsql
stable
set search_path = public
as $$
declare
  v jsonb;
begin
  select jsonb_build_object(
    'gross_sales', coalesce((
      select sum(subtotal) from public.orders
      where status = 'completed' and created_at::date between p_from and p_to
    ), 0),
    'discounts', coalesce((
      select sum(discount_amount) from public.orders
      where status = 'completed' and created_at::date between p_from and p_to
    ), 0),
    'net_sales', coalesce((
      select sum(subtotal - discount_amount) from public.orders
      where status = 'completed' and created_at::date between p_from and p_to
    ), 0),
    'cogs', coalesce((
      select sum(oi.unit_cost_snapshot * oi.quantity)
      from public.order_items oi join public.orders o on o.id = oi.order_id
      where o.status = 'completed' and o.created_at::date between p_from and p_to
    ), 0),
    'expenses', coalesce((
      select sum(amount) from public.expenses where expense_date between p_from and p_to
    ), 0)
  ) into v;
  return v;
end;
$$;
grant execute on function public.get_profit_and_loss(date, date) to authenticated;

-- ---------------------------------------------------------------------
-- Low stock listing — quantity_on_hand vs reorder_level is a column-to-
-- column comparison PostgREST can't express as a simple filter, so it's
-- an RPC instead of a plain `.select()` with `.lte()`.
-- ---------------------------------------------------------------------
create or replace function public.get_low_stock_items(p_limit integer default 10)
returns table (
  inventory_id uuid,
  product_variant_id uuid,
  product_name text,
  size text,
  color text,
  quantity_on_hand integer,
  reorder_level integer
)
language sql
stable
set search_path = public
as $$
  select i.id, pv.id, p.name, pv.size, pv.color, i.quantity_on_hand, i.reorder_level
  from public.inventory i
  join public.product_variants pv on pv.id = i.product_variant_id
  join public.products p on p.id = pv.product_id
  where i.quantity_on_hand <= i.reorder_level
  order by i.quantity_on_hand asc
  limit p_limit;
$$;
grant execute on function public.get_low_stock_items(integer) to authenticated;


-- ============================================================
-- FILE: 0013_purchase_functions.sql
-- ============================================================
-- =========================================================================
-- 0013_purchase_functions.sql
-- Atomic purchase-order creation (manager/admin only). Receiving stock
-- against a purchase is handled separately by receive_purchase_item()
-- in 0008_functions_business.sql.
-- =========================================================================

create or replace function public.create_purchase(
  p_supplier_id uuid,
  p_reference_number text,
  p_order_date date,
  p_expected_date date,
  p_notes text,
  p_items jsonb -- [{ product_variant_id, quantity, unit_cost }]
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_purchase_id uuid := gen_random_uuid();
  v_purchase_number text;
  v_item jsonb;
  v_subtotal numeric := 0;
  v_quantity integer;
  v_unit_cost numeric;
  v_line_total numeric;
begin
  if not public.is_manager_up() then
    raise exception 'Only managers or admins can create purchase orders';
  end if;
  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'A purchase order requires at least one item';
  end if;

  v_purchase_number := public.next_document_number('PO');

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_quantity := (v_item ->> 'quantity')::integer;
    v_unit_cost := (v_item ->> 'unit_cost')::numeric;
    if v_quantity is null or v_quantity <= 0 then
      raise exception 'Invalid quantity in purchase item';
    end if;
    v_subtotal := v_subtotal + (v_quantity * v_unit_cost);
  end loop;

  insert into public.purchases (
    id, purchase_number, supplier_id, reference_number, status, payment_status,
    order_date, expected_date, subtotal, total_cost, notes, created_by
  ) values (
    v_purchase_id, v_purchase_number, p_supplier_id, p_reference_number, 'ordered', 'unpaid',
    coalesce(p_order_date, current_date), p_expected_date, v_subtotal, v_subtotal, p_notes, auth.uid()
  );

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_quantity := (v_item ->> 'quantity')::integer;
    v_unit_cost := (v_item ->> 'unit_cost')::numeric;
    v_line_total := v_quantity * v_unit_cost;

    insert into public.purchase_items (purchase_id, product_variant_id, quantity, unit_cost, total_cost)
    values (v_purchase_id, (v_item ->> 'product_variant_id')::uuid, v_quantity, v_unit_cost, v_line_total);
  end loop;

  insert into public.audit_logs (user_id, action, module, record_id, details)
  values (auth.uid(), 'purchase_created', 'purchases', v_purchase_id,
          jsonb_build_object('purchase_number', v_purchase_number, 'total_cost', v_subtotal));

  return v_purchase_id;
end;
$$;
grant execute on function public.create_purchase(uuid, text, date, date, text, jsonb) to authenticated;

create or replace function public.update_purchase_payment_status(
  p_purchase_id uuid,
  p_payment_status payment_status
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_manager_up() then
    raise exception 'Only managers or admins can update purchase payment status';
  end if;

  update public.purchases set payment_status = p_payment_status where id = p_purchase_id;
end;
$$;
grant execute on function public.update_purchase_payment_status(uuid, payment_status) to authenticated;


-- ============================================================
-- FILE: 0014_fix_create_order_promo.sql
-- ============================================================
-- =========================================================================
-- 0014_fix_create_order_promo.sql
--
-- BUGFIX: create_order() failed on every order that did NOT use a promo code
-- (i.e. virtually every POS sale) with:
--   ERROR: record "v_promo" is not assigned yet
--
-- Cause: v_promo was declared as `record` and only populated inside the
-- `if p_promo_code is not null` branch, but the INSERT into public.orders
-- referenced v_promo.id / v_promo.type / v_promo.value unconditionally.
-- In PL/pgSQL, touching any field of a never-assigned record raises, even
-- from inside a CASE branch that wouldn't logically be taken.
--
-- Fix: replace the record variable with plain scalar variables, which are
-- simply NULL when no promo code is supplied. Behaviour is otherwise
-- identical to the original function.
-- =========================================================================

create or replace function public.create_order(
  p_customer_id uuid,
  p_sales_channel sales_channel,
  p_items jsonb,
  p_payment_method payment_method default null,
  p_discount_type discount_type default null,
  p_discount_value numeric default 0,
  p_promo_code text default null,
  p_shipping_amount numeric default 0,
  p_shipping_address text default null,
  p_shipping_notes text default null,
  p_amount_paid numeric default 0,
  p_notes text default null
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order_id uuid := gen_random_uuid();
  v_item jsonb;
  v_variant record;
  v_qty integer;
  v_unit_price numeric;
  v_line_total numeric;
  v_subtotal numeric := 0;
  v_discount_amount numeric := 0;
  v_tax_pct numeric;
  v_tax_amount numeric := 0;
  v_total numeric := 0;
  -- Scalars, not a record: these stay NULL when no promo code is used.
  v_promo_id uuid;
  v_promo_type discount_type;
  v_promo_value numeric;
  v_promo_max_discount numeric;
  v_promo_min_order numeric;
  v_promo_usage_limit integer;
  v_promo_usage_count integer;
  v_status order_status;
  v_payment_status payment_status;
  v_change numeric := 0;
  v_order_number text;
  v_auto_deduct order_status;
begin
  if not public.is_staff_up() then
    raise exception 'Not authorized to create orders';
  end if;
  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'An order requires at least one item';
  end if;

  select tax_percentage, auto_deduct_on into v_tax_pct, v_auto_deduct from public.settings where id = true;

  -- Pass 1: lock variants, validate, price server-side, accumulate subtotal.
  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_qty := (v_item ->> 'quantity')::integer;
    if v_qty is null or v_qty <= 0 then
      raise exception 'Invalid quantity for order item';
    end if;

    select pv.id, pv.selling_price, pv.cost_price, pv.status, p.name as product_name,
           pv.size, pv.color
    into v_variant
    from public.product_variants pv
    join public.products p on p.id = pv.product_id
    where pv.id = (v_item ->> 'variant_id')::uuid
    for update of pv;

    if v_variant.id is null then
      raise exception 'Product variant % not found', (v_item ->> 'variant_id');
    end if;
    if v_variant.status <> 'active' then
      raise exception '% (%/%) is not available for sale', v_variant.product_name, v_variant.size, v_variant.color;
    end if;

    v_subtotal := v_subtotal + (v_variant.selling_price * v_qty);
  end loop;

  -- Resolve discount: promo code takes precedence over a manual discount.
  if p_promo_code is not null then
    select id, type, value, max_discount_amount, min_order_amount, usage_limit, usage_count
    into v_promo_id, v_promo_type, v_promo_value, v_promo_max_discount,
         v_promo_min_order, v_promo_usage_limit, v_promo_usage_count
    from public.promo_codes
    where code = upper(p_promo_code) and status = 'active'
      and (starts_at is null or starts_at <= now())
      and (ends_at is null or ends_at >= now())
    for update;

    if v_promo_id is null then
      raise exception 'Promo code % is invalid or expired', p_promo_code;
    end if;
    if v_promo_usage_limit is not null and v_promo_usage_count >= v_promo_usage_limit then
      raise exception 'Promo code % has reached its usage limit', p_promo_code;
    end if;
    if v_subtotal < v_promo_min_order then
      raise exception 'Order does not meet the minimum amount for promo code %', p_promo_code;
    end if;

    v_discount_amount := case
      when v_promo_type = 'percentage' then v_subtotal * v_promo_value / 100
      else v_promo_value
    end;
    if v_promo_max_discount is not null then
      v_discount_amount := least(v_discount_amount, v_promo_max_discount);
    end if;

    update public.promo_codes set usage_count = usage_count + 1 where id = v_promo_id;
  elsif p_discount_type is not null and p_discount_value > 0 then
    v_discount_amount := case
      when p_discount_type = 'percentage' then v_subtotal * least(p_discount_value, 100) / 100
      else p_discount_value
    end;
  end if;

  v_discount_amount := least(v_discount_amount, v_subtotal);
  v_tax_amount := round((v_subtotal - v_discount_amount) * coalesce(v_tax_pct, 0) / 100, 2);
  v_total := v_subtotal - v_discount_amount + v_tax_amount + coalesce(p_shipping_amount, 0);

  v_change := greatest(coalesce(p_amount_paid, 0) - v_total, 0);
  v_payment_status := case
    when coalesce(p_amount_paid, 0) >= v_total and v_total > 0 then 'paid'
    when coalesce(p_amount_paid, 0) > 0 then 'partial'
    else 'unpaid'
  end;

  v_status := case when p_sales_channel = 'pos' and v_payment_status = 'paid' then 'completed' else 'pending' end;
  v_order_number := public.next_document_number('ORD');

  insert into public.orders (
    id, order_number, customer_id, sales_channel, status, payment_status, payment_method,
    promo_code_id, discount_type, discount_value, discount_amount, subtotal, tax_amount,
    shipping_amount, total_amount, amount_paid, change_amount, shipping_address, shipping_notes,
    notes, created_by, completed_at, inventory_deducted
  ) values (
    v_order_id, v_order_number, p_customer_id, p_sales_channel, v_status, v_payment_status, p_payment_method,
    v_promo_id,
    case when v_promo_id is not null then v_promo_type else p_discount_type end,
    coalesce(case when v_promo_id is not null then v_promo_value else p_discount_value end, 0),
    v_discount_amount,
    v_subtotal, v_tax_amount, coalesce(p_shipping_amount, 0), v_total, coalesce(p_amount_paid, 0), v_change,
    p_shipping_address, p_shipping_notes, p_notes, auth.uid(),
    case when v_status = 'completed' then now() else null end,
    v_status = v_auto_deduct
  );

  -- Pass 2: create line items (re-reading priced values) and deduct stock if applicable.
  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_qty := (v_item ->> 'quantity')::integer;

    select pv.id, pv.selling_price, pv.cost_price, p.name as product_name, pv.size, pv.color
    into v_variant
    from public.product_variants pv
    join public.products p on p.id = pv.product_id
    where pv.id = (v_item ->> 'variant_id')::uuid;

    v_unit_price := v_variant.selling_price;
    v_line_total := round(v_unit_price * v_qty * (1 - (case when v_subtotal > 0 then v_discount_amount / v_subtotal else 0 end)), 2);

    insert into public.order_items (
      order_id, product_variant_id, product_name_snapshot, variant_label_snapshot,
      quantity, unit_price, unit_cost_snapshot, discount_amount, line_total
    ) values (
      v_order_id, v_variant.id, v_variant.product_name, v_variant.size || ' / ' || v_variant.color,
      v_qty, v_unit_price, v_variant.cost_price, (v_unit_price * v_qty) - v_line_total, v_line_total
    );

    if v_status = v_auto_deduct then
      perform public.adjust_inventory(
        v_variant.id, 'sale', -v_qty, 'order', v_order_id, 'Order ' || v_order_number, auth.uid()
      );
    end if;
  end loop;

  if coalesce(p_amount_paid, 0) > 0 then
    insert into public.payments (order_id, amount, method, created_by)
    values (v_order_id, p_amount_paid, coalesce(p_payment_method, 'cash'), auth.uid());
  end if;

  insert into public.order_status_history (order_id, status, note, created_by)
  values (v_order_id, v_status, 'Order created', auth.uid());

  if p_sales_channel = 'online' then
    insert into public.notifications (type, title, message, link)
    values (
      'new_order', 'New online order',
      v_order_number || ' — ' || to_char(v_total, 'FM999,999,990.00'),
      '/sales/orders/' || v_order_id
    );
  end if;
  if v_payment_status in ('unpaid', 'partial') then
    insert into public.notifications (type, title, message, link)
    values ('pending_payment', 'Payment pending', v_order_number || ' is ' || v_payment_status, '/sales/orders/' || v_order_id);
  end if;

  insert into public.audit_logs (user_id, action, module, record_id, details)
  values (auth.uid(), 'order_created', 'orders', v_order_id,
          jsonb_build_object('order_number', v_order_number, 'total_amount', v_total));

  return v_order_id;
end;
$$;

grant execute on function public.create_order(
  uuid, sales_channel, jsonb, payment_method, discount_type, numeric, text, numeric, text, text, numeric, text
) to authenticated;


-- ============================================================
-- FILE: 0015_fix_enum_case_casts.sql
-- ============================================================
-- =========================================================================
-- 0015_fix_enum_case_casts.sql
--
-- BUGFIX: two statements assigned a CASE expression to an enum column and
-- failed with:
--   ERROR 42804: column "..." is of type <enum> but expression is of type text
--
-- Cause: a bare string literal ('low_stock') has type `unknown` and is
-- implicitly coerced to the target enum on INSERT/UPDATE. But inside a
-- CASE, PostgreSQL first resolves the branches to a common type — which
-- for two unknown literals is `text` — and there is no implicit cast from
-- text to an enum. Adding an explicit cast on the CASE result fixes it.
--
-- Affected:
--   1. notify_stock_levels()  -> notifications.type   (fired on every stock
--      change that crosses the reorder level, so this broke completing any
--      order whose deduction pushed a variant to/below its reorder level)
--   2. receive_purchase_item() -> purchases.status    (would have broken
--      receiving stock against any purchase order)
-- =========================================================================

create or replace function public.notify_stock_levels()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_product_name text;
  v_variant_label text;
begin
  if new.quantity_on_hand <= new.reorder_level and
     (old.quantity_on_hand is null or old.quantity_on_hand > new.reorder_level) then

    select p.name, pv.size || ' / ' || pv.color
    into v_product_name, v_variant_label
    from public.product_variants pv
    join public.products p on p.id = pv.product_id
    where pv.id = new.product_variant_id;

    insert into public.notifications (type, title, message, link)
    values (
      (case when new.quantity_on_hand = 0 then 'out_of_stock' else 'low_stock' end)::notification_type,
      case when new.quantity_on_hand = 0 then 'Out of stock' else 'Low stock' end,
      v_product_name || ' (' || v_variant_label || ') — ' || new.quantity_on_hand || ' left',
      '/inventory'
    );
  end if;
  return new;
end;
$$;

create or replace function public.receive_purchase_item(
  p_purchase_item_id uuid,
  p_quantity integer
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item record;
  v_purchase record;
  v_remaining_unreceived integer;
begin
  if not public.is_manager_up() then
    raise exception 'Only managers or admins can receive purchases';
  end if;
  if p_quantity <= 0 then
    raise exception 'Received quantity must be positive';
  end if;

  select * into v_item from public.purchase_items where id = p_purchase_item_id for update;
  if v_item.id is null then
    raise exception 'Purchase item not found';
  end if;
  if v_item.quantity_received + p_quantity > v_item.quantity then
    raise exception 'Cannot receive more than the ordered quantity';
  end if;

  update public.purchase_items
  set quantity_received = quantity_received + p_quantity
  where id = p_purchase_item_id;

  select * into v_purchase from public.purchases where id = v_item.purchase_id for update;

  perform public.adjust_inventory(
    v_item.product_variant_id, 'stock_in', p_quantity, 'purchase', v_purchase.id,
    'Receipt against ' || v_purchase.purchase_number, auth.uid()
  );

  select count(*) into v_remaining_unreceived
  from public.purchase_items
  where purchase_id = v_purchase.id and quantity_received < quantity;

  update public.purchases
  set status = (case when v_remaining_unreceived = 0 then 'received' else 'partially_received' end)::purchase_status,
      received_at = case when v_remaining_unreceived = 0 then now() else received_at end
  where id = v_purchase.id;

  insert into public.audit_logs (user_id, action, module, record_id, details)
  values (auth.uid(), 'purchase_item_received', 'purchases', v_purchase.id,
          jsonb_build_object('purchase_item_id', p_purchase_item_id, 'quantity', p_quantity));
end;
$$;
grant execute on function public.receive_purchase_item(uuid, integer) to authenticated;


