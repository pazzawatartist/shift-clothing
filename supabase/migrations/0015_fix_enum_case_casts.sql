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
