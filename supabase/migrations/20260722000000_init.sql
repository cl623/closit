-- clos.it Phase 1–2 schema
create extension if not exists "pgcrypto";

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now()
);

create table public.avatars (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  image_path text not null,
  body_width integer not null default 400,
  body_height integer not null default 600,
  is_active boolean not null default true
);

create type public.item_category as enum (
  'hair',
  'accessory',
  'outerwear',
  'top',
  'bottom',
  'shoes'
);

create table public.items (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references public.profiles (id) on delete set null,
  name text not null,
  image_path text not null,
  category public.item_category not null,
  color text not null default '',
  style text not null default '',
  anchor_x numeric(5, 4) not null default 0.5,
  anchor_y numeric(5, 4) not null default 0.5,
  z_index integer not null,
  is_system boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.outfits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  avatar_id uuid not null references public.avatars (id),
  name text not null default 'Untitled outfit',
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.outfit_items (
  outfit_id uuid not null references public.outfits (id) on delete cascade,
  item_id uuid not null references public.items (id) on delete cascade,
  slot_category public.item_category not null,
  primary key (outfit_id, slot_category),
  unique (outfit_id, item_id)
);

create index items_owner_id_idx on public.items (owner_id);
create index items_category_idx on public.items (category);
create index outfits_user_id_idx on public.outfits (user_id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Keep outfits.updated_at fresh
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger outfits_set_updated_at
  before update on public.outfits
  for each row execute function public.set_updated_at();

-- RLS
alter table public.profiles enable row level security;
alter table public.avatars enable row level security;
alter table public.items enable row level security;
alter table public.outfits enable row level security;
alter table public.outfit_items enable row level security;

create policy "Profiles are viewable by everyone"
  on public.profiles for select
  using (true);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "Avatars are viewable by everyone"
  on public.avatars for select
  using (true);

create policy "Items are viewable by everyone"
  on public.items for select
  using (true);

create policy "Authenticated users can insert own items"
  on public.items for insert
  with check (
    auth.uid() = owner_id
    and is_system = false
  );

create policy "Owners can update own non-system items"
  on public.items for update
  using (auth.uid() = owner_id and is_system = false)
  with check (auth.uid() = owner_id and is_system = false);

create policy "Owners can delete own non-system items"
  on public.items for delete
  using (auth.uid() = owner_id and is_system = false);

create policy "Users can view own outfits"
  on public.outfits for select
  using (auth.uid() = user_id);

create policy "Users can insert own outfits"
  on public.outfits for insert
  with check (auth.uid() = user_id);

create policy "Users can update own outfits"
  on public.outfits for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own outfits"
  on public.outfits for delete
  using (auth.uid() = user_id);

create policy "Users can view own outfit items"
  on public.outfit_items for select
  using (
    exists (
      select 1 from public.outfits o
      where o.id = outfit_id and o.user_id = auth.uid()
    )
  );

create policy "Users can insert own outfit items"
  on public.outfit_items for insert
  with check (
    exists (
      select 1 from public.outfits o
      where o.id = outfit_id and o.user_id = auth.uid()
    )
  );

create policy "Users can update own outfit items"
  on public.outfit_items for update
  using (
    exists (
      select 1 from public.outfits o
      where o.id = outfit_id and o.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.outfits o
      where o.id = outfit_id and o.user_id = auth.uid()
    )
  );

create policy "Users can delete own outfit items"
  on public.outfit_items for delete
  using (
    exists (
      select 1 from public.outfits o
      where o.id = outfit_id and o.user_id = auth.uid()
    )
  );

-- Storage buckets
insert into storage.buckets (id, name, public)
values
  ('avatars', 'avatars', true),
  ('items', 'items', true)
on conflict (id) do nothing;

create policy "Public read avatars bucket"
  on storage.objects for select
  using (bucket_id = 'avatars');

create policy "Public read items bucket"
  on storage.objects for select
  using (bucket_id = 'items');

create policy "Authenticated users upload to items bucket"
  on storage.objects for insert
  with check (
    bucket_id = 'items'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Owners can update own item files"
  on storage.objects for update
  using (
    bucket_id = 'items'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Owners can delete own item files"
  on storage.objects for delete
  using (
    bucket_id = 'items'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
