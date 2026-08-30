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
