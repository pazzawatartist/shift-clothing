-- =========================================================================
-- 0016_public_branding.sql
--
-- The login screen and the browser title need the business name/logo, but
-- they render before anyone is signed in, and `settings` is readable only
-- by active staff (see 0009_rls.sql). Rather than loosening RLS on the whole
-- settings row — which also holds tax rates and inventory rules — this
-- exposes just the two presentational fields through a SECURITY DEFINER
-- function that anon may call.
--
-- This is what makes the app white-label: one codebase can serve many
-- businesses, each branding itself from its own database.
-- =========================================================================

create or replace function public.get_public_branding()
returns table (business_name text, logo_url text)
language sql
stable
security definer
set search_path = public
as $$
  select business_name, logo_url from public.settings where id = true;
$$;

grant execute on function public.get_public_branding() to anon, authenticated;
