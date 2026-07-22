-- clos.it Phase 3 — social publishing & engagement

alter table public.outfits
  add column if not exists published_at timestamptz;

create table public.outfit_likes (
  user_id uuid not null references public.profiles (id) on delete cascade,
  outfit_id uuid not null references public.outfits (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, outfit_id)
);

create table public.item_likes (
  user_id uuid not null references public.profiles (id) on delete cascade,
  item_id uuid not null references public.items (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, item_id)
);

create table public.item_saves (
  user_id uuid not null references public.profiles (id) on delete cascade,
  item_id uuid not null references public.items (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, item_id)
);

create index outfit_likes_outfit_id_idx on public.outfit_likes (outfit_id);
create index outfit_likes_created_at_idx on public.outfit_likes (created_at);
create index item_likes_item_id_idx on public.item_likes (item_id);
create index item_likes_created_at_idx on public.item_likes (created_at);
create index item_saves_item_id_idx on public.item_saves (item_id);
create index item_saves_user_id_idx on public.item_saves (user_id);
create index item_saves_created_at_idx on public.item_saves (created_at);
create index outfits_published_at_idx on public.outfits (published_at desc)
  where is_published = true;

-- Replace owner-only outfit select with owner OR published
drop policy if exists "Users can view own outfits" on public.outfits;
create policy "Users can view own or published outfits"
  on public.outfits for select
  using (
    auth.uid() = user_id
    or is_published = true
  );

-- Replace owner-only outfit_items select with owner OR published parent
drop policy if exists "Users can view own outfit items" on public.outfit_items;
create policy "Users can view own or published outfit items"
  on public.outfit_items for select
  using (
    exists (
      select 1 from public.outfits o
      where o.id = outfit_id
        and (o.user_id = auth.uid() or o.is_published = true)
    )
  );

alter table public.outfit_likes enable row level security;
alter table public.item_likes enable row level security;
alter table public.item_saves enable row level security;

create policy "Outfit likes are viewable by everyone"
  on public.outfit_likes for select
  using (true);

create policy "Users can insert own outfit likes"
  on public.outfit_likes for insert
  with check (auth.uid() = user_id);

create policy "Users can delete own outfit likes"
  on public.outfit_likes for delete
  using (auth.uid() = user_id);

create policy "Item likes are viewable by everyone"
  on public.item_likes for select
  using (true);

create policy "Users can insert own item likes"
  on public.item_likes for insert
  with check (auth.uid() = user_id);

create policy "Users can delete own item likes"
  on public.item_likes for delete
  using (auth.uid() = user_id);

create policy "Item saves are viewable by everyone"
  on public.item_saves for select
  using (true);

create policy "Users can insert own item saves"
  on public.item_saves for insert
  with check (auth.uid() = user_id);

create policy "Users can delete own item saves"
  on public.item_saves for delete
  using (auth.uid() = user_id);
