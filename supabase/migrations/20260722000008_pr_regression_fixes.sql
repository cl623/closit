-- Atomic draft replacement, first-admin bootstrap, and related hardening.

-- ---------------------------------------------------------------------------
-- 1) Replace outfit layers in one transaction (and demote to draft)
-- ---------------------------------------------------------------------------

create or replace function public.replace_outfit_draft(
  p_outfit_id uuid,
  p_avatar_id uuid,
  p_name text,
  p_items jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_owner uuid;
  v_item jsonb;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated'
      using errcode = '42501';
  end if;

  select o.user_id into v_owner
  from public.outfits o
  where o.id = p_outfit_id;

  if v_owner is null then
    raise exception 'Outfit not found';
  end if;

  if v_owner <> auth.uid() then
    raise exception 'Not outfit owner'
      using errcode = '42501';
  end if;

  -- Demote first so prevent_emptying_published_outfit does not block clears.
  update public.outfits
  set
    avatar_id = p_avatar_id,
    name = coalesce(nullif(trim(p_name), ''), 'Untitled outfit'),
    is_published = false,
    published_at = null
  where id = p_outfit_id
    and user_id = auth.uid();

  delete from public.outfit_items
  where outfit_id = p_outfit_id;

  for v_item in
    select value from jsonb_array_elements(coalesce(p_items, '[]'::jsonb))
  loop
    insert into public.outfit_items (outfit_id, item_id, slot_category, layer_z)
    values (
      p_outfit_id,
      (v_item->>'item_id')::uuid,
      (v_item->>'slot_category')::public.item_category,
      coalesce((v_item->>'layer_z')::integer, 0)
    );
  end loop;

  return p_outfit_id;
end;
$$;

revoke all on function public.replace_outfit_draft(uuid, uuid, text, jsonb) from public;
grant execute on function public.replace_outfit_draft(uuid, uuid, text, jsonb)
  to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 2) Allow first-admin bootstrap + SQL editor / service_role updates
-- ---------------------------------------------------------------------------

create or replace function public.protect_profile_is_admin()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.is_admin is distinct from old.is_admin then
    if current_user in ('postgres', 'supabase_admin')
      or session_user in ('postgres', 'supabase_admin')
      or coalesce(auth.role(), '') = 'service_role' then
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
