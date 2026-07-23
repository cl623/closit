-- Local development seed (applied by the Supabase CLI after migrations).
--
-- Recent Supabase CLI versions no longer grant public-schema data privileges to
-- the anon/authenticated API roles by default, whereas hosted Supabase projects
-- still provide them. The application's migrations rely on those platform-level
-- grants, so this file restores them for the local stack to keep parity.
--
-- Row Level Security (enabled in the init migration) remains the source of truth
-- for row access; these grants only expose the tables/functions to the API roles.

grant usage on schema public to anon, authenticated, service_role;

grant all on all tables in schema public to anon, authenticated, service_role;
grant all on all sequences in schema public to anon, authenticated, service_role;
grant all on all routines in schema public to anon, authenticated, service_role;

alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema public grant all on routines to anon, authenticated, service_role;

-- Re-lock privileged writers that must not be callable with the anon key.
-- (Migrations revoke these, but the blanket routine grant above would reopen them.)
do $$
begin
  if to_regprocedure('public.sync_monthly_badges()') is not null then
    execute 'revoke all on function public.sync_monthly_badges() from public, anon, authenticated';
    execute 'grant execute on function public.sync_monthly_badges() to service_role';
  end if;
end $$;
