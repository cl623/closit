-- Phase 5 analytics + Phase 6 badges/monthly leaderboards + profile moderation helpers.

alter table public.profiles
  add column if not exists disabled_at timestamptz;

-- ---------------------------------------------------------------------------
-- Badges
-- ---------------------------------------------------------------------------

create table if not exists public.badges (
  id text primary key,
  name text not null,
  description text not null default ''
);

create table if not exists public.user_badges (
  user_id uuid not null references public.profiles (id) on delete cascade,
  badge_id text not null references public.badges (id) on delete cascade,
  period_key text not null,
  awarded_at timestamptz not null default now(),
  primary key (user_id, badge_id, period_key)
);

create index if not exists user_badges_user_id_idx on public.user_badges (user_id);

insert into public.badges (id, name, description) values
  ('monthly_top_creator', 'Top Creator', 'Ranked #1 creator for the month'),
  ('monthly_trendsetter', 'Trendsetter', 'Finished in the top 3 creators for the month'),
  ('monthly_style_star', 'Style Star', 'Created the most-liked outfit of the month')
on conflict (id) do nothing;

alter table public.badges enable row level security;
alter table public.user_badges enable row level security;

drop policy if exists "Badges are viewable by everyone" on public.badges;
create policy "Badges are viewable by everyone"
  on public.badges for select
  using (true);

drop policy if exists "User badges are viewable by everyone" on public.user_badges;
create policy "User badges are viewable by everyone"
  on public.user_badges for select
  using (true);

-- ---------------------------------------------------------------------------
-- Monthly leaderboard views (calendar month)
-- ---------------------------------------------------------------------------

create or replace view public.leaderboard_outfits_month
with (security_invoker = false) as
select
  o.id as outfit_id,
  o.name as outfit_name,
  o.user_id as creator_id,
  p.display_name as creator_name,
  o.avatar_id,
  o.published_at,
  count(ol.user_id)::integer as like_count
from public.outfits o
join public.profiles p on p.id = o.user_id
left join public.outfit_likes ol
  on ol.outfit_id = o.id
  and ol.created_at >= date_trunc('month', now())
  and ol.created_at < date_trunc('month', now()) + interval '1 month'
where o.is_published = true
  and p.disabled_at is null
group by o.id, o.name, o.user_id, p.display_name, o.avatar_id, o.published_at
order by like_count desc, o.published_at desc nulls last;

create or replace view public.leaderboard_creators_month
with (security_invoker = false) as
select
  p.id as creator_id,
  p.display_name as creator_name,
  coalesce(outfit_stats.outfit_like_count, 0)::integer as outfit_like_count,
  coalesce(save_stats.item_save_count, 0)::integer as item_save_count
from public.profiles p
left join (
  select
    o.user_id as creator_id,
    count(ol.user_id)::integer as outfit_like_count
  from public.outfits o
  join public.outfit_likes ol on ol.outfit_id = o.id
  where o.is_published = true
    and ol.created_at >= date_trunc('month', now())
    and ol.created_at < date_trunc('month', now()) + interval '1 month'
  group by o.user_id
) outfit_stats on outfit_stats.creator_id = p.id
left join (
  select
    i.owner_id as creator_id,
    count(s.user_id)::integer as item_save_count
  from public.items i
  join public.item_saves s on s.item_id = i.id
  where i.owner_id is not null
    and s.created_at >= date_trunc('month', now())
    and s.created_at < date_trunc('month', now()) + interval '1 month'
  group by i.owner_id
) save_stats on save_stats.creator_id = p.id
where p.disabled_at is null
  and (
    coalesce(outfit_stats.outfit_like_count, 0) > 0
    or coalesce(save_stats.item_save_count, 0) > 0
  )
order by
  coalesce(outfit_stats.outfit_like_count, 0) desc,
  coalesce(save_stats.item_save_count, 0) desc,
  p.display_name asc nulls last;

grant select on public.leaderboard_outfits_month to anon, authenticated, service_role;
grant select on public.leaderboard_creators_month to anon, authenticated, service_role;

-- Sync monthly badges from current standings (idempotent for period_key).
create or replace function public.sync_monthly_badges()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_period text := to_char(date_trunc('month', now()), 'YYYY-MM');
  r record;
  v_rank integer := 0;
begin
  delete from public.user_badges
  where period_key = v_period
    and badge_id in ('monthly_top_creator', 'monthly_trendsetter', 'monthly_style_star');

  for r in
    select creator_id
    from public.leaderboard_creators_month
    order by outfit_like_count desc, item_save_count desc
    limit 3
  loop
    v_rank := v_rank + 1;
    if v_rank = 1 then
      insert into public.user_badges (user_id, badge_id, period_key)
      values (r.creator_id, 'monthly_top_creator', v_period)
      on conflict do nothing;
    end if;
    insert into public.user_badges (user_id, badge_id, period_key)
    values (r.creator_id, 'monthly_trendsetter', v_period)
    on conflict do nothing;
  end loop;

  insert into public.user_badges (user_id, badge_id, period_key)
  select creator_id, 'monthly_style_star', v_period
  from public.leaderboard_outfits_month
  where like_count > 0
  order by like_count desc, published_at desc nulls last
  limit 1
  on conflict do nothing;
end;
$$;

revoke all on function public.sync_monthly_badges() from public;
grant execute on function public.sync_monthly_badges() to authenticated, anon, service_role;

-- ---------------------------------------------------------------------------
-- Phase 5: admin analytics RPCs (7d / 30d)
-- ---------------------------------------------------------------------------

create or replace function public.admin_trending_colors(p_days integer default 7)
returns table (color text, engagement_count bigint)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Admin access required' using errcode = '42501';
  end if;

  return query
  select
    lower(trim(i.color)) as color,
    count(*)::bigint as engagement_count
  from public.item_likes il
  join public.items i on i.id = il.item_id
  where il.created_at >= now() - make_interval(days => greatest(p_days, 1))
    and trim(i.color) <> ''
  group by lower(trim(i.color))
  order by engagement_count desc, color asc
  limit 25;
end;
$$;

create or replace function public.admin_trending_styles(p_days integer default 7)
returns table (style text, engagement_count bigint)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Admin access required' using errcode = '42501';
  end if;

  return query
  select
    lower(trim(i.style)) as style,
    count(*)::bigint as engagement_count
  from public.item_likes il
  join public.items i on i.id = il.item_id
  where il.created_at >= now() - make_interval(days => greatest(p_days, 1))
    and trim(i.style) <> ''
  group by lower(trim(i.style))
  order by engagement_count desc, style asc
  limit 25;
end;
$$;

create or replace function public.admin_trending_combinations(p_days integer default 7)
returns table (
  item_a_id uuid,
  item_a_name text,
  item_b_id uuid,
  item_b_name text,
  pair_count bigint,
  like_weight bigint
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Admin access required' using errcode = '42501';
  end if;

  return query
  with liked_outfits as (
    select o.id as outfit_id, count(ol.user_id)::bigint as like_count
    from public.outfits o
    join public.outfit_likes ol on ol.outfit_id = o.id
    where o.is_published = true
      and ol.created_at >= now() - make_interval(days => greatest(p_days, 1))
    group by o.id
  ),
  pairs as (
    select
      least(oi1.item_id, oi2.item_id) as item_a_id,
      greatest(oi1.item_id, oi2.item_id) as item_b_id,
      count(*)::bigint as pair_count,
      sum(lo.like_count)::bigint as like_weight
    from liked_outfits lo
    join public.outfit_items oi1 on oi1.outfit_id = lo.outfit_id
    join public.outfit_items oi2
      on oi2.outfit_id = lo.outfit_id
      and oi1.item_id < oi2.item_id
    group by least(oi1.item_id, oi2.item_id), greatest(oi1.item_id, oi2.item_id)
  )
  select
    p.item_a_id,
    ia.name as item_a_name,
    p.item_b_id,
    ib.name as item_b_name,
    p.pair_count,
    p.like_weight
  from pairs p
  join public.items ia on ia.id = p.item_a_id
  join public.items ib on ib.id = p.item_b_id
  order by p.like_weight desc, p.pair_count desc
  limit 25;
end;
$$;

revoke all on function public.admin_trending_colors(integer) from public;
revoke all on function public.admin_trending_styles(integer) from public;
revoke all on function public.admin_trending_combinations(integer) from public;
grant execute on function public.admin_trending_colors(integer) to authenticated, service_role;
grant execute on function public.admin_trending_styles(integer) to authenticated, service_role;
grant execute on function public.admin_trending_combinations(integer) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Admin moderation: delete item / disable account
-- ---------------------------------------------------------------------------

drop policy if exists "Admins can delete non-system items" on public.items;
create policy "Admins can delete non-system items"
  on public.items for delete
  using (public.is_admin() and is_system = false);

drop policy if exists "Admins can update profiles" on public.profiles;
create policy "Admins can update profiles"
  on public.profiles for update
  using (public.is_admin())
  with check (public.is_admin());

create or replace function public.admin_delete_item(p_item_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item public.items%rowtype;
begin
  if not public.is_admin() then
    raise exception 'Admin access required' using errcode = '42501';
  end if;

  select * into v_item from public.items where id = p_item_id;
  if not found then
    raise exception 'Item not found';
  end if;
  if v_item.is_system then
    raise exception 'Cannot delete system items';
  end if;

  delete from public.items where id = p_item_id;
end;
$$;

create or replace function public.admin_disable_account(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Admin access required' using errcode = '42501';
  end if;

  if p_user_id = auth.uid() then
    raise exception 'Cannot disable your own account';
  end if;

  if exists (select 1 from public.profiles where id = p_user_id and is_admin = true) then
    raise exception 'Cannot disable another administrator';
  end if;

  delete from public.items
  where owner_id = p_user_id
    and is_system = false;

  delete from public.outfits
  where user_id = p_user_id;

  update public.profiles
  set
    disabled_at = now(),
    display_name = coalesce(display_name, 'user') || ' (disabled)'
  where id = p_user_id
    and disabled_at is null;
end;
$$;

revoke all on function public.admin_delete_item(uuid) from public;
revoke all on function public.admin_disable_account(uuid) from public;
grant execute on function public.admin_delete_item(uuid) to authenticated, service_role;
grant execute on function public.admin_disable_account(uuid) to authenticated, service_role;

-- Hide disabled users' published outfits from public feed-style selects via helper note:
-- app filters disabled creators; also block likes from disabled accounts optionally later.
