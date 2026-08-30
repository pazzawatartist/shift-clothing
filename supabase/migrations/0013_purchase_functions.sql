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
