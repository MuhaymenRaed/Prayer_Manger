-- =============================================================================
-- Prayer Manager – Supabase schema (initial)
-- =============================================================================
-- Design notes:
--   * Every user-owned table carries a `user_id uuid` referencing auth.users.
--   * Row Level Security (RLS) is ON for every table; a user can only ever
--     see/modify their own rows. This is the whole security model — never
--     disable it.
--   * `updated_at` is maintained by a trigger so sync/last-write-wins is easy.
--   * A new auth user automatically gets a profile + default settings row via
--     the handle_new_user() trigger.
-- =============================================================================

-- ---------- Extensions -------------------------------------------------------
create extension if not exists "pgcrypto";   -- gen_random_uuid()

-- ---------- Enums ------------------------------------------------------------
-- The 5 obligatory prayers tracked for qadha (sunrise is not a prayer).
create type prayer_type as enum ('fajr', 'dhuhr', 'asr', 'maghrib', 'isha');

-- How a given prayer on a given day was performed.
create type prayer_status as enum (
  'on_time',   -- prayed within its window
  'late',      -- prayed but after the window (still not qadha)
  'qadha',     -- made up later
  'missed'     -- not prayed
);

create type theme_mode    as enum ('light', 'dark', 'system');
create type app_language  as enum ('en', 'ar');

-- Kind of mutation applied to a qadha counter — used for the audit log.
create type qadha_action  as enum ('increment', 'decrement', 'set', 'reset');

-- ---------- Shared trigger: keep updated_at fresh ---------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- =============================================================================
-- 1. profiles  — one row per user, extends auth.users
-- =============================================================================
create table public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  avatar_url   text,
  -- madhhab / calculation preference affects prayer-time math; stored here so
  -- it travels with the account.
  madhhab      text not null default 'shia_ithna_ashari',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create trigger trg_profiles_updated
  before update on public.profiles
  for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;

create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);
create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = id);
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);
create policy "profiles_delete_own" on public.profiles
  for delete using (auth.uid() = id);

-- =============================================================================
-- 2. user_settings — 1:1 with user, mirrors AppSettings in the app
-- =============================================================================
create table public.user_settings (
  user_id              uuid primary key references auth.users (id) on delete cascade,
  theme                theme_mode   not null default 'dark',
  language             app_language not null default 'en',
  prayer_notifications boolean      not null default true,
  sound                boolean      not null default true,
  vibration            boolean      not null default false,
  updated_at           timestamptz  not null default now()
);

create trigger trg_user_settings_updated
  before update on public.user_settings
  for each row execute function public.set_updated_at();

alter table public.user_settings enable row level security;

create policy "settings_select_own" on public.user_settings
  for select using (auth.uid() = user_id);
create policy "settings_insert_own" on public.user_settings
  for insert with check (auth.uid() = user_id);
create policy "settings_update_own" on public.user_settings
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "settings_delete_own" on public.user_settings
  for delete using (auth.uid() = user_id);

-- =============================================================================
-- 3. user_locations — saved locations (supports more than one; one primary)
-- =============================================================================
create table public.user_locations (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade,
  display_name text not null,
  latitude     double precision not null check (latitude  between -90  and 90),
  longitude    double precision not null check (longitude between -180 and 180),
  is_primary   boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index user_locations_user_idx on public.user_locations (user_id);

-- Exactly one primary location per user.
create unique index user_locations_one_primary
  on public.user_locations (user_id)
  where is_primary;

create trigger trg_user_locations_updated
  before update on public.user_locations
  for each row execute function public.set_updated_at();

alter table public.user_locations enable row level security;

create policy "locations_select_own" on public.user_locations
  for select using (auth.uid() = user_id);
create policy "locations_insert_own" on public.user_locations
  for insert with check (auth.uid() = user_id);
create policy "locations_update_own" on public.user_locations
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "locations_delete_own" on public.user_locations
  for delete using (auth.uid() = user_id);

-- =============================================================================
-- 4. qadha_counts — the missed-prayer tracker (current state)
--    One row per (user, prayer_type). This is the cloud version of
--    TrackerCounts. Kept as rows (not 5 columns) so adding/removing a tracked
--    prayer is data, not a migration.
-- =============================================================================
create table public.qadha_counts (
  user_id     uuid        not null references auth.users (id) on delete cascade,
  prayer      prayer_type not null,
  count       integer     not null default 0 check (count >= 0),
  updated_at  timestamptz not null default now(),
  primary key (user_id, prayer)
);

create trigger trg_qadha_counts_updated
  before update on public.qadha_counts
  for each row execute function public.set_updated_at();

alter table public.qadha_counts enable row level security;

create policy "qadha_select_own" on public.qadha_counts
  for select using (auth.uid() = user_id);
create policy "qadha_insert_own" on public.qadha_counts
  for insert with check (auth.uid() = user_id);
create policy "qadha_update_own" on public.qadha_counts
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "qadha_delete_own" on public.qadha_counts
  for delete using (auth.uid() = user_id);

-- =============================================================================
-- 5. qadha_adjustments — audit log of every change to a qadha counter
--    Powers history, charts ("you cleared 12 qadha this week"), and undo.
--    Optional but recommended; the app works without it.
-- =============================================================================
create table public.qadha_adjustments (
  id          uuid         primary key default gen_random_uuid(),
  user_id     uuid         not null references auth.users (id) on delete cascade,
  prayer      prayer_type  not null,
  action      qadha_action not null,
  delta       integer      not null,   -- +1, -1, or net change for set/reset
  result      integer      not null check (result >= 0),  -- count after change
  created_at  timestamptz  not null default now()
);

create index qadha_adj_user_time_idx
  on public.qadha_adjustments (user_id, created_at desc);

alter table public.qadha_adjustments enable row level security;

create policy "qadha_adj_select_own" on public.qadha_adjustments
  for select using (auth.uid() = user_id);
create policy "qadha_adj_insert_own" on public.qadha_adjustments
  for insert with check (auth.uid() = user_id);
-- Log rows are immutable: no update/delete policies on purpose.

-- =============================================================================
-- 6. prayer_logs — daily prayer completion (the "make it full" feature)
--    One row per (user, prayer, date). Lets you build streaks, calendars,
--    and "today's prayers" checklists.
-- =============================================================================
create table public.prayer_logs (
  id          uuid          primary key default gen_random_uuid(),
  user_id     uuid          not null references auth.users (id) on delete cascade,
  prayer      prayer_type   not null,
  prayer_date date          not null,
  status      prayer_status not null default 'on_time',
  prayed_at   timestamptz,                    -- when the user marked it done
  note        text,
  created_at  timestamptz   not null default now(),
  updated_at  timestamptz   not null default now(),
  unique (user_id, prayer, prayer_date)
);

create index prayer_logs_user_date_idx
  on public.prayer_logs (user_id, prayer_date desc);

create trigger trg_prayer_logs_updated
  before update on public.prayer_logs
  for each row execute function public.set_updated_at();

alter table public.prayer_logs enable row level security;

create policy "prayer_logs_select_own" on public.prayer_logs
  for select using (auth.uid() = user_id);
create policy "prayer_logs_insert_own" on public.prayer_logs
  for insert with check (auth.uid() = user_id);
create policy "prayer_logs_update_own" on public.prayer_logs
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "prayer_logs_delete_own" on public.prayer_logs
  for delete using (auth.uid() = user_id);

-- =============================================================================
-- 7. devices — Expo push tokens, one per physical device, for notifications
-- =============================================================================
create table public.devices (
  id          uuid        primary key default gen_random_uuid(),
  user_id     uuid        not null references auth.users (id) on delete cascade,
  expo_push_token text     not null,
  platform    text,                    -- 'ios' | 'android'
  last_seen   timestamptz not null default now(),
  created_at  timestamptz not null default now(),
  unique (user_id, expo_push_token)
);

create index devices_user_idx on public.devices (user_id);

alter table public.devices enable row level security;

create policy "devices_select_own" on public.devices
  for select using (auth.uid() = user_id);
create policy "devices_insert_own" on public.devices
  for insert with check (auth.uid() = user_id);
create policy "devices_update_own" on public.devices
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "devices_delete_own" on public.devices
  for delete using (auth.uid() = user_id);

-- =============================================================================
-- 8. New-user bootstrap: create profile + settings + zeroed qadha counters
-- =============================================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)));

  insert into public.user_settings (user_id) values (new.id);

  insert into public.qadha_counts (user_id, prayer)
  select new.id, p
  from unnest(enum_range(null::prayer_type)) as p;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =============================================================================
-- 9. Atomic counter RPC — increment/decrement safely and log it in one call
--    Call from the app: supabase.rpc('adjust_qadha', { p_prayer, p_delta })
-- =============================================================================
create or replace function public.adjust_qadha(p_prayer prayer_type, p_delta int)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user   uuid := auth.uid();
  v_result integer;
begin
  if v_user is null then
    raise exception 'not authenticated';
  end if;

  insert into public.qadha_counts (user_id, prayer, count)
  values (v_user, p_prayer, greatest(0, p_delta))
  on conflict (user_id, prayer)
  do update set count = greatest(0, public.qadha_counts.count + p_delta)
  returning count into v_result;

  insert into public.qadha_adjustments (user_id, prayer, action, delta, result)
  values (
    v_user,
    p_prayer,
    case when p_delta >= 0 then 'increment' else 'decrement' end::qadha_action,
    p_delta,
    v_result
  );

  return v_result;
end;
$$;

-- =============================================================================
-- 10. Helper views
-- =============================================================================
-- Total remaining qadha across all prayers (the "Total" badge in the tracker).
create or replace view public.qadha_totals
with (security_invoker = true) as
select user_id, sum(count)::int as total
from public.qadha_counts
group by user_id;

-- Per-day completion summary for building a calendar / streak.
create or replace view public.daily_prayer_summary
with (security_invoker = true) as
select
  user_id,
  prayer_date,
  count(*) filter (where status in ('on_time', 'late', 'qadha')) as completed,
  count(*) as logged
from public.prayer_logs
group by user_id, prayer_date;
