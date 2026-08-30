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
