-- clos.it Phase 4 — weekly leaderboard views

create or replace view public.leaderboard_outfits_week as
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

create or replace view public.leaderboard_creators_week as
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
