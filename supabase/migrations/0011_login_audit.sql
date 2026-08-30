-- =========================================================================
-- 0011_login_audit.sql
-- Auth events (sign-in) never touch our schema directly, so the app calls
-- this RPC right after a successful Supabase Auth login to record it.
-- =========================================================================

create or replace function public.log_login()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.audit_logs (user_id, action, module, record_id, details)
  values (auth.uid(), 'login', 'auth', auth.uid(), '{}'::jsonb);
end;
$$;
grant execute on function public.log_login() to authenticated;
