-- User reports for items and outfits.

create type public.report_target_type as enum ('item', 'outfit');
create type public.report_status as enum ('open', 'resolved', 'dismissed');

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles (id) on delete cascade,
  target_type public.report_target_type not null,
  item_id uuid references public.items (id) on delete set null,
  outfit_id uuid references public.outfits (id) on delete set null,
  reported_user_id uuid references public.profiles (id) on delete set null,
  reason text not null,
  notes text not null default '',
  status public.report_status not null default 'open',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint reports_target_check check (
    (target_type = 'item' and item_id is not null)
    or (target_type = 'outfit' and outfit_id is not null)
  )
);

create index reports_reporter_id_idx on public.reports (reporter_id);
create index reports_status_idx on public.reports (status);
create index reports_item_id_idx on public.reports (item_id);
create index reports_outfit_id_idx on public.reports (outfit_id);
create index reports_created_at_idx on public.reports (created_at desc);

create trigger reports_set_updated_at
  before update on public.reports
  for each row execute function public.set_updated_at();

alter table public.reports enable row level security;

create policy "Users can view own reports"
  on public.reports for select
  using (auth.uid() = reporter_id);

create policy "Users can insert own reports"
  on public.reports for insert
  with check (auth.uid() = reporter_id);

create policy "Users can update own open reports"
  on public.reports for update
  using (auth.uid() = reporter_id and status = 'open')
  with check (auth.uid() = reporter_id);
