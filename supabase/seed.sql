-- =========================================================================
-- DEV/LOCAL SEED DATA ONLY.
-- Runs automatically after migrations on `supabase db reset` (or manually
-- via `supabase db execute -f supabase/seed.sql`). Never run this against
-- a production project — it inserts sample catalog data and writes to
-- inventory directly (bypassing adjust_inventory(), which is fine here
-- only because this script runs with elevated privileges outside RLS).
--
-- Profiles and orders are intentionally NOT seeded: profiles require a
-- real auth.users row (created via Supabase Auth), and the first person
-- who signs up automatically becomes 'admin' (see handle_new_user() in
-- 0007_functions_core.sql). Sign up, then exercise POS/orders for real.
-- =========================================================================

insert into public.categories (name, slug, description) values
  ('T-Shirts', 't-shirts', 'Short and long sleeve tees'),
  ('Hoodies', 'hoodies', 'Pullover and zip-up hoodies'),
  ('Sweatpants', 'sweatpants', 'Joggers and sweatpants'),
  ('Accessories', 'accessories', 'Caps, bags, and other accessories')
on conflict (slug) do nothing;

insert into public.collections (name, slug, description, season) values
  ('Core Collection', 'core-collection', 'Year-round essentials', null),
  ('2026 Summer Drop', '2026-summer-drop', 'Limited summer release', 'Summer 2026')
on conflict (slug) do nothing;

insert into public.suppliers (name, contact_person, phone, email, address, status) values
  ('Manila Textile Co.', 'Ana Reyes', '+63 917 123 4567', 'ana@manilatextile.example', 'Quezon City, Metro Manila', 'active'),
  ('Cebu Garments Supply', 'Marco Santos', '+63 918 987 6543', 'marco@cebugarments.example', 'Cebu City, Cebu', 'active')
on conflict do nothing;

insert into public.customers (full_name, phone, email, address) values
  ('Kris Payer', '099 758 9092', 'kris.payer@example.com', 'Makati City, Metro Manila'),
  ('Barbara Cruz', '099 214 5567', 'barbara.cruz@example.com', 'Pasig City, Metro Manila'),
  ('Miguel Torres', '099 331 8820', 'miguel.torres@example.com', 'Taguig City, Metro Manila')
on conflict do nothing;

-- ---------------------------------------------------------------------
-- Sample product: Classic Oversized Tee (Black/White x S/M/L)
-- ---------------------------------------------------------------------
do $$
declare
  v_category_id uuid;
  v_collection_id uuid;
  v_supplier_id uuid;
  v_product_id uuid;
  v_variant_id uuid;
  v_size text;
  v_color text;
  v_i int := 1;
begin
  select id into v_category_id from public.categories where slug = 't-shirts';
  select id into v_collection_id from public.collections where slug = 'core-collection';
  select id into v_supplier_id from public.suppliers where name = 'Manila Textile Co.';

  insert into public.products (
    sku, name, slug, description, category_id, collection_id, supplier_id, brand,
    status, cost_price, selling_price, manufacturing_cost, packaging_cost, other_cost
  ) values (
    'TEE-OVERSIZED-001', 'Classic Oversized Tee', 'classic-oversized-tee',
    'Heavyweight 280gsm oversized fit tee.', v_category_id, v_collection_id, v_supplier_id, 'SHIFT',
    'active', 250, 599, 180, 40, 30
  )
  returning id into v_product_id;

  foreach v_color in array array['Black', 'White'] loop
    foreach v_size in array array['S', 'M', 'L'] loop
      insert into public.product_variants (
        product_id, sku, size, color, barcode, cost_price, selling_price, reorder_level
      ) values (
        v_product_id,
        'TEE-' || upper(left(v_color, 3)) || '-' || v_size || '-' || lpad(v_i::text, 3, '0'),
        v_size, v_color, '4800000' || lpad(v_i::text, 6, '0'), 250, 599, 10
      )
      returning id into v_variant_id;

      insert into public.inventory (product_variant_id, quantity_on_hand, reorder_level)
      values (v_variant_id, 30, 10);

      v_i := v_i + 1;
    end loop;
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- Sample product: Pullover Hoodie (Black/Beige x S/M/L/XL)
-- ---------------------------------------------------------------------
do $$
declare
  v_category_id uuid;
  v_collection_id uuid;
  v_supplier_id uuid;
  v_product_id uuid;
  v_variant_id uuid;
  v_size text;
  v_color text;
  v_i int := 1;
begin
  select id into v_category_id from public.categories where slug = 'hoodies';
  select id into v_collection_id from public.collections where slug = '2026-summer-drop';
  select id into v_supplier_id from public.suppliers where name = 'Cebu Garments Supply';

  insert into public.products (
    sku, name, slug, description, category_id, collection_id, supplier_id, brand,
    status, cost_price, selling_price, manufacturing_cost, packaging_cost, other_cost
  ) values (
    'HOOD-PULLOVER-001', 'SHIFT Worldwide Pullover Hoodie', 'shift-worldwide-pullover-hoodie',
    'Oversized fleece pullover hoodie with front pouch pocket.', v_category_id, v_collection_id, v_supplier_id, 'SHIFT',
    'active', 480, 1250, 380, 60, 40
  )
  returning id into v_product_id;

  foreach v_color in array array['Black', 'Beige'] loop
    foreach v_size in array array['S', 'M', 'L', 'XL'] loop
      insert into public.product_variants (
        product_id, sku, size, color, barcode, cost_price, selling_price, reorder_level
      ) values (
        v_product_id,
        'HOOD-' || upper(left(v_color, 3)) || '-' || v_size || '-' || lpad(v_i::text, 3, '0'),
        v_size, v_color, '4800001' || lpad(v_i::text, 6, '0'), 480, 1250, 8
      )
      returning id into v_variant_id;

      insert into public.inventory (product_variant_id, quantity_on_hand, reorder_level)
      values (v_variant_id, 4, 8); -- intentionally low stock to exercise alerts

      v_i := v_i + 1;
    end loop;
  end loop;
end $$;
