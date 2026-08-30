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
