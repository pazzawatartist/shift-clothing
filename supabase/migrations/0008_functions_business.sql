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
