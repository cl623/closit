-- Security hardening for publish, reports moderation, likes, and engagement privacy.

-- ---------------------------------------------------------------------------
-- 1) Published outfits must have at least one outfit_item
-- ---------------------------------------------------------------------------

create or replace function public.enforce_published_outfit_has_items()
returns trigger
language plpgsql
as $$
begin
  if new.is_published = true then
    if not exists (
      select 1 from public.outfit_items oi where oi.outfit_id = new.id
    ) then
      raise exception 'Cannot publish an outfit with no equipped items'
        using errcode = 'check_violation';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists outfits_enforce_published_has_items on public.outfits;
create trigger outfits_enforce_published_has_items
  before insert or update of is_published
  on public.outfits
  for each row
  execute function public.enforce_published_outfit_has_items();

create or replace function public.prevent_emptying_published_outfit()
returns trigger
language plpgsql
as $$
declare
  remaining integer;
  parent_published boolean;
begin
  select o.is_published into parent_published
  from public.outfits o
  where o.id = old.outfit_id;

  if coalesce(parent_published, false) then
    -- BEFORE DELETE: the row being removed is still counted.
    select count(*)::integer into remaining
    from public.outfit_items oi
    where oi.outfit_id = old.outfit_id;

    if remaining <= 1 then
      raise exception 'Cannot remove the last item from a published outfit'
        using errcode = 'check_violation';
    end if;
  end if;

  return old;
end;
$$;

drop trigger if exists outfit_items_prevent_empty_published on public.outfit_items;
create trigger outfit_items_prevent_empty_published
  before delete on public.outfit_items
  for each row
  execute function public.prevent_emptying_published_outfit();

-- ---------------------------------------------------------------------------
-- 2) Reporters cannot change moderation status (or update reports at all)
-- ---------------------------------------------------------------------------

drop policy if exists "Users can update own open reports" on public.reports;

drop policy if exists "Users can insert own reports" on public.reports;
create policy "Users can insert own reports"
  on public.reports for insert
  with check (
    auth.uid() = reporter_id
    and status = 'open'
  );

-- ---------------------------------------------------------------------------
-- 3) Outfit likes only on published outfits; engagement rows not world-readable
-- ---------------------------------------------------------------------------

drop policy if exists "Users can insert own outfit likes" on public.outfit_likes;
create policy "Users can insert own outfit likes"
  on public.outfit_likes for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1
      from public.outfits o
      where o.id = outfit_id
        and o.is_published = true
    )
  );

drop policy if exists "Outfit likes are viewable by everyone" on public.outfit_likes;
create policy "Users can view own outfit likes"
  on public.outfit_likes for select
  using (auth.uid() = user_id);

drop policy if exists "Item likes are viewable by everyone" on public.item_likes;
create policy "Users can view own item likes"
  on public.item_likes for select
  using (auth.uid() = user_id);

drop policy if exists "Item saves are viewable by everyone" on public.item_saves;
create policy "Users can view own item saves"
  on public.item_saves for select
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- 4) Secure aggregate RPCs (no row-level identity leakage)
-- ---------------------------------------------------------------------------

create or replace function public.count_outfit_likes(p_outfit_ids uuid[])
returns table (outfit_id uuid, like_count bigint)
language sql
stable
security definer
set search_path = public
as $$
  select ol.outfit_id, count(*)::bigint as like_count
  from public.outfit_likes ol
  where ol.outfit_id = any (p_outfit_ids)
  group by ol.outfit_id;
$$;

create or replace function public.count_item_engagement(p_item_ids uuid[])
returns table (item_id uuid, like_count bigint, save_count bigint)
language sql
stable
security definer
set search_path = public
as $$
  select
    ids.item_id,
    coalesce(l.like_count, 0)::bigint as like_count,
    coalesce(s.save_count, 0)::bigint as save_count
  from unnest(p_item_ids) as ids(item_id)
  left join (
    select il.item_id, count(*)::bigint as like_count
    from public.item_likes il
    where il.item_id = any (p_item_ids)
    group by il.item_id
  ) l on l.item_id = ids.item_id
  left join (
    select isv.item_id, count(*)::bigint as save_count
    from public.item_saves isv
    where isv.item_id = any (p_item_ids)
    group by isv.item_id
  ) s on s.item_id = ids.item_id;
$$;

revoke all on function public.count_outfit_likes(uuid[]) from public;
revoke all on function public.count_item_engagement(uuid[]) from public;
grant execute on function public.count_outfit_likes(uuid[]) to anon, authenticated, service_role;
grant execute on function public.count_item_engagement(uuid[]) to anon, authenticated, service_role;

-- Leaderboard views join private engagement tables; keep owner rights so aggregates work.
create or replace view public.leaderboard_outfits_week
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
  and ol.created_at >= now() - interval '7 days'
where o.is_published = true
group by o.id, o.name, o.user_id, p.display_name, o.avatar_id, o.published_at
order by like_count desc, o.published_at desc nulls last;

create or replace view public.leaderboard_creators_week
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
    and ol.created_at >= now() - interval '7 days'
  group by o.user_id
) outfit_stats on outfit_stats.creator_id = p.id
left join (
  select
    i.owner_id as creator_id,
    count(s.user_id)::integer as item_save_count
  from public.items i
  join public.item_saves s on s.item_id = i.id
  where i.owner_id is not null
    and s.created_at >= now() - interval '7 days'
  group by i.owner_id
) save_stats on save_stats.creator_id = p.id
where coalesce(outfit_stats.outfit_like_count, 0) > 0
   or coalesce(save_stats.item_save_count, 0) > 0
order by
  coalesce(outfit_stats.outfit_like_count, 0) desc,
  coalesce(save_stats.item_save_count, 0) desc,
  p.display_name asc nulls last;

grant select on public.leaderboard_outfits_week to anon, authenticated, service_role;
grant select on public.leaderboard_creators_week to anon, authenticated, service_role;
