-- Admin roles, moderation access, and admin-only engagement rankings.

alter table public.profiles
  add column if not exists is_admin boolean not null default false;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select p.is_admin from public.profiles p where p.id = auth.uid()),
    false
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated, service_role;

-- Non-admins cannot flip is_admin on any profile (including their own).
create or replace function public.protect_profile_is_admin()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.is_admin is distinct from old.is_admin then
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

drop trigger if exists profiles_protect_is_admin on public.profiles;
create trigger profiles_protect_is_admin
  before update on public.profiles
  for each row
  execute function public.protect_profile_is_admin();

-- Admins see every report; normal users still only see their own (existing policy).
drop policy if exists "Admins can view all reports" on public.reports;
create policy "Admins can view all reports"
  on public.reports for select
  using (public.is_admin());

drop policy if exists "Admins can update reports" on public.reports;
create policy "Admins can update reports"
  on public.reports for update
  using (public.is_admin())
  with check (public.is_admin());

-- Top liked outfits (admin only)
create or replace function public.admin_top_liked_outfits(p_limit integer default 100)
returns table (
  outfit_id uuid,
  outfit_name text,
  creator_id uuid,
  creator_name text,
  is_published boolean,
  like_count bigint
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Admin access required'
      using errcode = '42501';
  end if;

  return query
  select
    o.id as outfit_id,
    o.name as outfit_name,
    o.user_id as creator_id,
    p.display_name as creator_name,
    o.is_published,
    count(ol.user_id)::bigint as like_count
  from public.outfits o
  join public.profiles p on p.id = o.user_id
  join public.outfit_likes ol on ol.outfit_id = o.id
  group by o.id, o.name, o.user_id, p.display_name, o.is_published
  order by count(ol.user_id) desc, o.updated_at desc
  limit least(coalesce(nullif(p_limit, 0), 100), 100);
end;
$$;

-- Top liked items (admin only)
create or replace function public.admin_top_liked_items(p_limit integer default 100)
returns table (
  item_id uuid,
  item_name text,
  category public.item_category,
  owner_id uuid,
  owner_name text,
  is_system boolean,
  like_count bigint
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Admin access required'
      using errcode = '42501';
  end if;

  return query
  select
    i.id as item_id,
    i.name as item_name,
    i.category,
    i.owner_id,
    p.display_name as owner_name,
    i.is_system,
    count(il.user_id)::bigint as like_count
  from public.items i
  left join public.profiles p on p.id = i.owner_id
  join public.item_likes il on il.item_id = i.id
  group by i.id, i.name, i.category, i.owner_id, p.display_name, i.is_system
  order by count(il.user_id) desc, i.created_at desc
  limit least(coalesce(nullif(p_limit, 0), 100), 100);
end;
$$;

revoke all on function public.admin_top_liked_outfits(integer) from public;
revoke all on function public.admin_top_liked_items(integer) from public;
grant execute on function public.admin_top_liked_outfits(integer) to authenticated, service_role;
grant execute on function public.admin_top_liked_items(integer) to authenticated, service_role;
