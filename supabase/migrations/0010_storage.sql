-- =========================================================================
-- 0010_storage.sql
-- Storage buckets for product images, the business logo, and expense
-- receipts, with matching RLS policies on storage.objects.
-- =========================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('product-images', 'product-images', true, 5242880, array['image/png', 'image/jpeg', 'image/webp', 'image/avif']),
  ('business-logo', 'business-logo', true, 2097152, array['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']),
  ('expense-receipts', 'expense-receipts', false, 10485760, array['image/png', 'image/jpeg', 'image/webp', 'application/pdf'])
on conflict (id) do nothing;

-- product-images: public read, manager/admin write
create policy product_images_public_read on storage.objects for select
  using (bucket_id = 'product-images');
create policy product_images_manager_write on storage.objects for insert to authenticated
  with check (bucket_id = 'product-images' and public.is_manager_up());
create policy product_images_manager_update on storage.objects for update to authenticated
  using (bucket_id = 'product-images' and public.is_manager_up())
  with check (bucket_id = 'product-images' and public.is_manager_up());
create policy product_images_manager_delete on storage.objects for delete to authenticated
  using (bucket_id = 'product-images' and public.is_manager_up());

-- business-logo: public read, admin write
create policy business_logo_public_read on storage.objects for select
  using (bucket_id = 'business-logo');
create policy business_logo_admin_write on storage.objects for insert to authenticated
  with check (bucket_id = 'business-logo' and public.is_admin());
create policy business_logo_admin_update on storage.objects for update to authenticated
  using (bucket_id = 'business-logo' and public.is_admin())
  with check (bucket_id = 'business-logo' and public.is_admin());
create policy business_logo_admin_delete on storage.objects for delete to authenticated
  using (bucket_id = 'business-logo' and public.is_admin());

-- expense-receipts: private, manager/admin only (matches expenses table access)
create policy expense_receipts_manager_read on storage.objects for select to authenticated
  using (bucket_id = 'expense-receipts' and public.is_manager_up());
create policy expense_receipts_manager_write on storage.objects for insert to authenticated
  with check (bucket_id = 'expense-receipts' and public.is_manager_up());
create policy expense_receipts_manager_update on storage.objects for update to authenticated
  using (bucket_id = 'expense-receipts' and public.is_manager_up())
  with check (bucket_id = 'expense-receipts' and public.is_manager_up());
create policy expense_receipts_manager_delete on storage.objects for delete to authenticated
  using (bucket_id = 'expense-receipts' and public.is_manager_up());
