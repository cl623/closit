-- Fix protect_profile_is_admin bypass under SECURITY DEFINER.
--
-- Migration 20260722000008_pr_regression_fixes allowed SQL-editor updates by
-- checking current_user / session_user against postgres. Inside a SECURITY
-- DEFINER function owned by postgres, current_user is always postgres, so every
-- authenticated caller could set profiles.is_admin via the REST API.

create or replace function public.protect_profile_is_admin()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.is_admin is distinct from old.is_admin then
    -- Service-role JWT only (never current_user — DEFINER runs as owner).
    if coalesce(auth.role(), '') = 'service_role' then
      return new;
    end if;

    -- Bootstrap the first admin when none exist yet.
    if not exists (
      select 1 from public.profiles p where p.is_admin = true
    ) then
      return new;
    end if;

    if auth.uid() is null or not exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.is_admin = true
    ) then
      raise exception 'Only administrators can change is_admin'
        using errcode = '42501';
    end if;
  end if;

  return new;
end;
$$;
