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
