-- =========================================================================
-- 0009_rls.sql
-- Row Level Security for every table. Nothing is left world-writable:
-- high-value mutations (inventory, orders, returns, purchases receiving)
-- have NO client-facing INSERT/UPDATE policy at all — they are only
-- reachable through the SECURITY DEFINER RPCs in 0008, which perform
-- their own role checks. Everything else uses is_staff_up()/
-- is_manager_up()/is_admin() from 0007.
-- =========================================================================

alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.collections enable row level security;
alter table public.suppliers enable row level security;
alter table public.customers enable row level security;
alter table public.products enable row level security;
alter table public.product_images enable row level security;
alter table public.product_variants enable row level security;
alter table public.inventory enable row level security;
alter table public.inventory_transactions enable row level security;
alter table public.purchases enable row level security;
alter table public.purchase_items enable row level security;
alter table public.promo_codes enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.payments enable row level security;
alter table public.order_status_history enable row level security;
alter table public.returns enable row level security;
alter table public.return_items enable row level security;
alter table public.expenses enable row level security;
alter table public.notifications enable row level security;
alter table public.settings enable row level security;
alter table public.audit_logs enable row level security;
alter table public.numbering_sequences enable row level security;

-- ---------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------
create or replace function public.prevent_role_self_escalation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- auth.uid() is null for trusted server-side calls made with the service-role
  -- key (e.g. the admin user-management screen) — those bypass RLS already and
  -- are gated in the application layer instead, so only block *user-session*
  -- (JWT-bearing) requests that aren't admins.
  if auth.uid() is not null and not public.is_admin() and (new.role <> old.role or new.status <> old.status) then
    raise exception 'Only an admin can change a user''s role or status';
  end if;
  return new;
end;
$$;

create trigger prevent_role_self_escalation
  before update on public.profiles
  for each row execute function public.prevent_role_self_escalation();

create policy profiles_select on public.profiles for select to authenticated using (true);
create policy profiles_update on public.profiles for update to authenticated
  using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());
create policy profiles_delete on public.profiles for delete to authenticated using (public.is_admin());

-- ---------------------------------------------------------------------
-- Reference data: categories, collections, suppliers
-- ---------------------------------------------------------------------
create policy categories_select on public.categories for select to authenticated using (public.is_staff_up());
create policy categories_write on public.categories for all to authenticated
  using (public.is_manager_up()) with check (public.is_manager_up());

create policy collections_select on public.collections for select to authenticated using (public.is_staff_up());
create policy collections_write on public.collections for all to authenticated
  using (public.is_manager_up()) with check (public.is_manager_up());

create policy suppliers_select on public.suppliers for select to authenticated using (public.is_staff_up());
create policy suppliers_write on public.suppliers for all to authenticated
  using (public.is_manager_up()) with check (public.is_manager_up());

-- ---------------------------------------------------------------------
-- customers — staff can manage, everyone can view
-- ---------------------------------------------------------------------
create policy customers_select on public.customers for select to authenticated using (public.is_staff_up());
create policy customers_insert on public.customers for insert to authenticated with check (public.is_staff_up());
create policy customers_update on public.customers for update to authenticated
  using (public.is_staff_up()) with check (public.is_staff_up());
create policy customers_delete on public.customers for delete to authenticated using (public.is_manager_up());

-- ---------------------------------------------------------------------
-- products, images, variants — staff view only, manager/admin manage
-- ---------------------------------------------------------------------
create policy products_select on public.products for select to authenticated using (public.is_staff_up());
create policy products_write on public.products for all to authenticated
  using (public.is_manager_up()) with check (public.is_manager_up());

create policy product_images_select on public.product_images for select to authenticated using (public.is_staff_up());
create policy product_images_write on public.product_images for all to authenticated
  using (public.is_manager_up()) with check (public.is_manager_up());

create policy product_variants_select on public.product_variants for select to authenticated using (public.is_staff_up());
create policy product_variants_write on public.product_variants for all to authenticated
  using (public.is_manager_up()) with check (public.is_manager_up());

-- ---------------------------------------------------------------------
-- inventory & its ledger — read-only to clients; all writes happen via
-- adjust_inventory()/record_manual_stock_movement() (SECURITY DEFINER).
-- ---------------------------------------------------------------------
create policy inventory_select on public.inventory for select to authenticated using (public.is_staff_up());
create policy inventory_txn_select on public.inventory_transactions for select to authenticated using (public.is_staff_up());

-- ---------------------------------------------------------------------
-- purchasing — manager/admin only end to end
-- ---------------------------------------------------------------------
create policy purchases_select on public.purchases for select to authenticated using (public.is_manager_up());
create policy purchases_write on public.purchases for insert to authenticated with check (public.is_manager_up());
create policy purchases_update on public.purchases for update to authenticated
  using (public.is_manager_up()) with check (public.is_manager_up());

create policy purchase_items_select on public.purchase_items for select to authenticated using (public.is_manager_up());
create policy purchase_items_insert on public.purchase_items for insert to authenticated with check (public.is_manager_up());
-- Receiving (quantity_received) is only mutated via receive_purchase_item(); no update policy here.

-- ---------------------------------------------------------------------
-- promo codes — manager/admin manage, staff can read to validate at POS
-- ---------------------------------------------------------------------
create policy promo_codes_select on public.promo_codes for select to authenticated using (public.is_staff_up());
create policy promo_codes_write on public.promo_codes for all to authenticated
  using (public.is_manager_up()) with check (public.is_manager_up());

-- ---------------------------------------------------------------------
-- orders — visible to any employee; all writes go through create_order()/
-- update_order_status() (SECURITY DEFINER). No client INSERT/UPDATE.
-- ---------------------------------------------------------------------
create policy orders_select on public.orders for select to authenticated using (public.is_staff_up());
create policy order_items_select on public.order_items for select to authenticated using (public.is_staff_up());
create policy payments_select on public.payments for select to authenticated using (public.is_staff_up());
create policy order_status_history_select on public.order_status_history for select to authenticated using (public.is_staff_up());

-- ---------------------------------------------------------------------
-- returns — staff can view/create requests, manager/admin resolve them
-- (writes happen via create_return_request()/resolve_return()).
-- ---------------------------------------------------------------------
create policy returns_select on public.returns for select to authenticated using (public.is_staff_up());
create policy return_items_select on public.return_items for select to authenticated using (public.is_staff_up());

-- ---------------------------------------------------------------------
-- expenses — manager/admin only (staff has no financial visibility)
-- ---------------------------------------------------------------------
create policy expenses_select on public.expenses for select to authenticated using (public.is_manager_up());
create policy expenses_write on public.expenses for all to authenticated
  using (public.is_manager_up()) with check (public.is_manager_up());

-- ---------------------------------------------------------------------
-- notifications
-- ---------------------------------------------------------------------
create policy notifications_select on public.notifications for select to authenticated
  using (user_id = auth.uid() or (user_id is null and public.is_manager_up()));
create policy notifications_update on public.notifications for update to authenticated
  using (user_id = auth.uid() or (user_id is null and public.is_manager_up()))
  with check (user_id = auth.uid() or (user_id is null and public.is_manager_up()));

-- ---------------------------------------------------------------------
-- settings — every employee can read (POS needs tax/currency), admin writes
-- ---------------------------------------------------------------------
create policy settings_select on public.settings for select to authenticated using (public.is_staff_up());
create policy settings_update on public.settings for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------
-- audit_logs — admin only
-- ---------------------------------------------------------------------
create policy audit_logs_select on public.audit_logs for select to authenticated using (public.is_admin());

-- numbering_sequences is purely internal bookkeeping for next_document_number();
-- no client policy is defined, so it is inaccessible to every client role.
