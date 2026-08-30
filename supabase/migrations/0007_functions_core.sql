-- =========================================================================
-- 0007_functions_core.sql
-- Role helpers, updated_at trigger, new-user provisioning, sequential
-- document numbering, and a generic audit-log trigger.
-- =========================================================================

-- ---------------------------------------------------------------------
-- Role helpers (SECURITY DEFINER so RLS policies on `profiles` can call
-- them without recursively re-triggering RLS on `profiles` itself).
-- ---------------------------------------------------------------------
create or replace function public.current_role()
returns user_role
language sql
security definer
stable
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin' and status = 'active'
  );
$$;

create or replace function public.is_manager_up()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('admin', 'manager') and status = 'active'
  );
$$;

create or replace function public.is_staff_up()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and status = 'active'
  );
$$;

grant execute on function public.current_role() to authenticated;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.is_manager_up() to authenticated;
grant execute on function public.is_staff_up() to authenticated;

-- ---------------------------------------------------------------------
-- Generic updated_at trigger
-- ---------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare
  t text;
begin
  foreach t in array array[
    'profiles', 'categories', 'collections', 'suppliers', 'customers',
    'products', 'product_variants', 'purchases', 'orders', 'returns', 'expenses'
  ] loop
    execute format(
      'create trigger set_updated_at before update on public.%I
       for each row execute function public.set_updated_at()', t
    );
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- New auth user -> profile row. First user ever becomes admin;
-- everyone after defaults to staff (an admin promotes them later).
-- ---------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role user_role;
begin
  select case when exists (select 1 from public.profiles) then 'staff' else 'admin' end::user_role
  into v_role;

  insert into public.profiles (id, full_name, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    new.email,
    v_role
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------
-- Sequential document numbering (ORD-2026-000001, PO-2026-000001, ...)
-- Atomic under concurrency via INSERT ... ON CONFLICT row locking.
-- ---------------------------------------------------------------------
create table public.numbering_sequences (
  key text primary key,
  next_value integer not null default 1
);

create or replace function public.next_document_number(p_prefix text, p_pad integer default 6)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_key text := p_prefix || '-' || to_char(now(), 'YYYY');
  v_value integer;
begin
  insert into public.numbering_sequences (key, next_value)
  values (v_key, 2)
  on conflict (key) do update set next_value = public.numbering_sequences.next_value + 1
  returning next_value - 1 into v_value;

  return upper(p_prefix) || '-' || to_char(now(), 'YYYY') || '-' || lpad(v_value::text, p_pad, '0');
end;
$$;

-- ---------------------------------------------------------------------
-- Generic audit log trigger for simple CRUD tables (products, expenses,
-- profiles). High-value business operations (orders, inventory, returns)
-- log explicitly from their own RPC functions with richer detail.
-- ---------------------------------------------------------------------
create or replace function public.log_audit_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_record_id uuid;
  v_action text;
begin
  v_record_id := coalesce(new.id, old.id);
  v_action := lower(tg_table_name) || '_' || lower(tg_op);

  insert into public.audit_logs (user_id, action, module, record_id, details)
  values (
    auth.uid(),
    v_action,
    tg_table_name,
    v_record_id,
    case tg_op
      when 'DELETE' then to_jsonb(old)
      else to_jsonb(new)
    end
  );

  return coalesce(new, old);
end;
$$;

do $$
declare
  t text;
begin
  foreach t in array array['products', 'expenses', 'profiles'] loop
    execute format(
      'create trigger log_audit after insert or update or delete on public.%I
       for each row execute function public.log_audit_event()', t
    );
  end loop;
end $$;
