# SHIFT — Clothing Line Business Management System

A full business management system for SHIFT Clothing: products & variants,
inventory, POS/orders, purchasing, customers, expenses, profit & loss,
returns/exchanges, reports, and settings — built on Next.js (App Router) and
Supabase (Postgres + Auth + Storage + RLS).

## Stack

Next.js 15 (App Router, TypeScript) · Tailwind CSS · shadcn/ui-style components
(hand-built, no CLI) · Supabase (Postgres, Auth, Storage, RLS) · React Hook
Form + Zod · TanStack Query · Recharts · Lucide icons.

## What's built

- **Auth & roles**: Supabase Auth (login, forgot/reset password), `profiles`
  table with `admin` / `manager` / `staff` roles. The very first person to
  sign up becomes `admin` automatically; everyone after defaults to `staff`.
  Route protection in `middleware.ts` + RLS on every table.
- **Dashboard**: live KPIs (today's sales/orders, revenue, expenses, net
  profit, low/out-of-stock counts, pending/completed orders), a 14-day
  revenue chart, sales-by-category donut, recent orders, low-stock alerts,
  top products — all from real aggregation RPCs (`get_dashboard_summary`,
  `get_sales_series`, `get_top_products`, `get_sales_by_category`,
  `get_low_stock_items`), not client-side aggregation of raw rows.
- **Products**: CRUD with categories, collections, suppliers, size/color
  variant matrix (generate variants from a size × color picker), per-product
  costing (manufacturing/packaging/other cost → margin), image upload to
  Supabase Storage.
- **Inventory**: stock overview, manual stock-in/adjustment/damage/transfer
  entries, full movement ledger, low-stock view — all mutations go through
  `adjust_inventory()` so the ledger and on-hand counts can never drift apart,
  and stock can never go negative from a race condition.
- **Sales / POS**: product grid with search + category filter, size/color
  variant picker, cart, order-level discount (fixed/%) or promo code, tax,
  payment method + amount tendered + change, walk-in or attached customer.
  Checkout goes through one atomic `create_order()` RPC — pricing, discount,
  tax, and totals are computed server-side, never trusted from the client.
- **Online orders**: shared `orders` table (`sales_channel`) with a status
  timeline (Placed → Confirmed → Processing → Packed → Completed) and
  atomic inventory deduction/restock on status transitions.
- **Purchasing**: suppliers CRUD with purchase history, purchase order
  creation, partial/full receiving that increases inventory atomically.
- **Customers**: CRUD, profile page with order history, lifetime spend, and
  last purchase (maintained by a DB trigger on order completion).
- **Expenses**: categorized expenses with receipt upload to a private
  Storage bucket (signed URLs on view).
- **Returns & exchanges**: staff request a return (refund or exchange, with
  stock-available exchange variant), manager/admin approve/reject/complete;
  completing atomically restocks and, for exchanges, deducts the new variant.
- **Reports**: Sales, Inventory (with stock valuation), Product Performance,
  Profit & Loss — date-range filterable, CSV export, print-friendly.
- **Settings**: business info + logo, tax %, low-stock threshold, which order
  status triggers inventory deduction, promo codes, and an audit log viewer.
- **Users**: admin-only invite (via Supabase Auth Admin API) and role/status
  management.
- **Notifications**: low stock, out of stock, new online order, pending
  payment, return request — bell menu polls every 30s.
- **Audit log**: every order/inventory/return/purchase mutation and all
  product/expense/profile CRUD is recorded automatically.

## Database

23 tables in `supabase/migrations/`, applied in filename order:
`profiles`, `categories`, `collections`, `suppliers`, `customers`, `products`,
`product_images`, `product_variants`, `inventory`, `inventory_transactions`,
`purchases`, `purchase_items`, `promo_codes`, `orders`, `order_items`,
`payments`, `order_status_history`, `returns`, `return_items`, `expenses`,
`notifications`, `settings`, `audit_logs` (+ an internal `numbering_sequences`
table for `ORD-2026-000001`-style document numbers).

Every table has RLS enabled. High-value mutations (inventory, order
creation/status, purchase receiving, return resolution) have **no direct
client INSERT/UPDATE policy at all** — they're only reachable through
`SECURITY DEFINER` RPC functions that perform their own role checks
(`is_staff_up()` / `is_manager_up()` / `is_admin()`), so a client can't bypass
business rules by calling `.insert()`/`.update()` directly even though those
functions bypass RLS internally. See the comments at the top of
`supabase/migrations/0008_functions_business.sql` and `0009_rls.sql`.

## Running this for more than one business

The app is white-label: the business name and logo shown on the login screen,
in the sidebar, and in the browser title all come from that deployment's own
`settings` row, not from the code. So **one repo can serve any number of
clients** — each with their own Supabase project and their own Vercel project,
both pointing at this same repository. Fix a bug once and every client gets it
on the next push.

Keep one Supabase project per client. Never put two businesses in one database.

**Per new client:**

1. Create a Supabase project. Copy the URL, anon key, and service role key.
2. SQL Editor → paste all of `supabase/combined_migrations.sql` → Run.
3. Do **not** run `supabase/seed.sql` for a real client — it inserts sample
   catalog data.
4. Authentication → URL Configuration → set Site URL, and add
   `<site>/auth/callback` and `<site>/reset-password` as redirect URLs.
5. Vercel → New Project → import this repo → add the four environment
   variables from `.env.example`.
6. Authentication → Users → Add user. **The first user created becomes the
   admin automatically.**
7. Sign in → Settings → Business Info → set the business name and upload the
   logo. That is what brands the whole app.

**The one thing still baked into the code** is `src/app/icon.png`, the browser
favicon. Next.js resolves it as a static file at build time, so a per-client
favicon means either swapping that file on a branch, or leaving the shared one.

## Setup

### 1. Create a Supabase project

Create a project at [supabase.com](https://supabase.com/dashboard). Note the
Project URL, anon key, and service role key from **Project Settings → API**.

### 2. Run the database migrations

In the Supabase dashboard, open **SQL Editor** and run each file in
`supabase/migrations/` **in filename order** (0001 → 0013), or use the CLI:

```bash
npx supabase login
npx supabase link --project-ref <your-project-ref>
npx supabase db push
```

Then seed development data (optional, safe to skip in production):

```bash
npx supabase db execute -f supabase/seed.sql
```

### 3. Configure Auth

In **Authentication → URL Configuration**, set the Site URL and add
`<your-site>/auth/callback` and `<your-site>/reset-password` as redirect
URLs. Email confirmations can stay on or off depending on your preference —
either way, sign up as the first user to become `admin` automatically.

### 4. Storage buckets

Already created by `0010_storage.sql`: `product-images` and `business-logo`
(public), `expense-receipts` (private). No manual step needed.

### 5. Environment variables

```bash
cp .env.example .env.local
```

Fill in `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and
`SUPABASE_SERVICE_ROLE_KEY` from step 1. Never commit `.env.local` or expose
the service role key to the browser.

### 6. Run locally

```bash
npm install
npm run dev
```

Sign up at `/login` → "Forgot your password?" isn't needed for the first
account — just go to Supabase Auth, or build a quick sign-up flow, or add
your first user via **Authentication → Users → Add user** in the dashboard
(that also fires `handle_new_user()` and makes them admin).

### 7. Deploy to Vercel

Push to a Git repo, import it in Vercel, add the same environment variables
from step 5 in **Project Settings → Environment Variables**, and deploy.
Set `NEXT_PUBLIC_SITE_URL` to your production URL and add
`https://<your-domain>/auth/callback` to Supabase's redirect URLs.

## Regenerating types

`src/types/database.types.ts` is hand-authored to match the migrations
exactly (and deliberately uses `type` aliases, not `interface` — see the
comment at the top of that file for why). Once your Supabase project is
live, you can regenerate it for perfect accuracy:

```bash
npx supabase gen types typescript --project-id <your-project-ref> > src/types/database.types.ts
```

## Verified

- `npm run typecheck` — 0 errors
- `npx eslint .` — 0 errors
- `npm run build` — all 33 routes compile and prerender/build successfully
- Manually verified in-browser: login, forgot-password pages render
  correctly with SHIFT branding; middleware correctly redirects
  unauthenticated requests away from protected routes (`/dashboard`,
  `/settings`, etc.) to `/login`.

What's **not** independently verified end-to-end (no live Supabase project
was available while building): the full POS checkout → inventory deduction
→ dashboard refresh loop, RLS policies against real user sessions, and the
purchase-receiving / return-exchange flows. The SQL and business logic were
written and reviewed carefully (atomic RPCs, ledger-based inventory, no
client-trusted totals), but you should walk through each core flow once
against your own project before relying on it in production.

## Known limitations / scope cuts

- **Barcode scanning**: variants have a `barcode` field and the POS/stock-in
  variant search matches on it, so a USB/Bluetooth barcode scanner (which
  types like a keyboard) works out of the box. There's no camera-based
  scanning UI.
- **Per-line discounts**: POS supports one order-wide discount or promo
  code; there's no separate per-line-item discount control.
- **Reserved stock**: the `quantity_reserved` column and `available_stock`
  concept exist and are displayed, but nothing currently reserves stock
  before payment (e.g., for a "hold" during checkout) — only completed
  sales deduct `quantity_on_hand`.
- **Damaged returns**: a return with reason "Damaged"/"Defective" restocks
  the item to normal sellable inventory rather than a separate
  non-sellable bucket; staff should follow up with a manual "Damage"
  adjustment if the item truly can't be resold.
- **Dedicated Customer/Supplier report pages**: not built as separate
  `/reports/*` routes — the same data (lifetime spend, purchase totals) is
  already shown on the Customers and Suppliers list pages.
