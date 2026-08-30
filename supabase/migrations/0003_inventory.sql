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
