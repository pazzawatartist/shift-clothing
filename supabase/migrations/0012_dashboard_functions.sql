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
