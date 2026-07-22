-- Allow multiple items per category on an outfit; per-instance layer order.

alter table public.outfit_items
  drop constraint if exists outfit_items_pkey;

-- Keep one row per item on an outfit; category is informational only.
alter table public.outfit_items
  drop constraint if exists outfit_items_outfit_id_item_id_key;

alter table public.outfit_items
  add column if not exists layer_z integer;

-- Backfill layer_z from the item's default z_index when missing.
update public.outfit_items oi
set layer_z = i.z_index
from public.items i
where i.id = oi.item_id
  and oi.layer_z is null;

alter table public.outfit_items
  alter column layer_z set not null;

alter table public.outfit_items
  alter column layer_z set default 0;

alter table public.outfit_items
  add primary key (outfit_id, item_id);

create index if not exists outfit_items_outfit_id_layer_z_idx
  on public.outfit_items (outfit_id, layer_z);
