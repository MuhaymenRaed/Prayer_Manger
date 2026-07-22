-- =============================================================================
-- REPAIR — STEP 2 of 2   (run AFTER 0004_repair_step1_enums.sql)
--
-- Brings the database to the exact shape the app expects, no matter what was
-- or wasn't applied before, and BACKFILLS every existing auth user.
-- Fully idempotent — safe to run again at any time.
--
-- Fixes observed in production:
--   • handle_new_user() + its trigger were missing → profiles stayed empty
--     for every signed-up user.
--   • columns added by later app versions were missing → every write from the
--     app was rejected (and silently swallowed by the client).
-- =============================================================================

create extension if not exists "pgcrypto";

-- ─── shared updated_at trigger fn ────────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ─── tables (created only if absent) ─────────────────────────────────────────
create table if not exists public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  avatar_url   text,
  madhhab      text not null default 'shia_ithna_ashari',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table if not exists public.user_settings (
  user_id              uuid primary key references auth.users (id) on delete cascade,
  theme                theme_mode   not null default 'dark',
  language             app_language not null default 'en',
  prayer_notifications boolean      not null default true,
  sound                boolean      not null default true,
  vibration            boolean      not null default false,
  updated_at           timestamptz  not null default now()
);

create table if not exists public.qadha_counts (
  user_id    uuid        not null references auth.users (id) on delete cascade,
  prayer     prayer_type not null,
  count      integer     not null default 0 check (count >= 0),
  updated_at timestamptz not null default now(),
  primary key (user_id, prayer)
);

-- NOTE: user_locations / prayer_logs / qadha_adjustments / devices are
-- intentionally NOT created — no app code references them. The chosen city
-- lives in user_settings.location_id. See 0005_drop_unused_tables.sql.

-- ─── columns added by later app versions ─────────────────────────────────────
alter table public.qadha_counts
  add column if not exists completed integer not null default 0 check (completed >= 0);

alter table public.user_settings add column if not exists motivation      boolean not null default true;
alter table public.user_settings add column if not exists quran_daily     boolean not null default true;
alter table public.user_settings add column if not exists location_id     text    not null default 'iq-najaf';
alter table public.user_settings add column if not exists pinned_times    boolean not null default true;
alter table public.user_settings add column if not exists show_asr_isha   boolean not null default true;
alter table public.user_settings add column if not exists show_sun_events boolean not null default true;
alter table public.user_settings add column if not exists athan_sound_id  text    not null default 'sound1';
alter table public.user_settings add column if not exists athan_mode      text    not null default 'takbir';

do $$ begin
  alter table public.user_settings
    add constraint user_settings_athan_mode_check
    check (athan_mode in ('takbir','notification'));
exception when duplicate_object then null; end $$;

-- ─── updated_at triggers ─────────────────────────────────────────────────────
drop trigger if exists trg_profiles_updated on public.profiles;
create trigger trg_profiles_updated before update on public.profiles
  for each row execute function public.set_updated_at();

drop trigger if exists trg_user_settings_updated on public.user_settings;
create trigger trg_user_settings_updated before update on public.user_settings
  for each row execute function public.set_updated_at();

drop trigger if exists trg_qadha_counts_updated on public.qadha_counts;
create trigger trg_qadha_counts_updated before update on public.qadha_counts
  for each row execute function public.set_updated_at();

-- ─── Row Level Security: every user sees only their own rows ─────────────────
alter table public.profiles      enable row level security;
alter table public.user_settings enable row level security;
alter table public.qadha_counts  enable row level security;

-- profiles (own row keyed by id)
drop policy if exists profiles_select_own on public.profiles;
drop policy if exists profiles_insert_own on public.profiles;
drop policy if exists profiles_update_own on public.profiles;
drop policy if exists profiles_delete_own on public.profiles;
create policy profiles_select_own on public.profiles for select using (auth.uid() = id);
create policy profiles_insert_own on public.profiles for insert with check (auth.uid() = id);
create policy profiles_update_own on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);
create policy profiles_delete_own on public.profiles for delete using (auth.uid() = id);

-- user_settings
drop policy if exists settings_select_own on public.user_settings;
drop policy if exists settings_insert_own on public.user_settings;
drop policy if exists settings_update_own on public.user_settings;
drop policy if exists settings_delete_own on public.user_settings;
create policy settings_select_own on public.user_settings for select using (auth.uid() = user_id);
create policy settings_insert_own on public.user_settings for insert with check (auth.uid() = user_id);
create policy settings_update_own on public.user_settings for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy settings_delete_own on public.user_settings for delete using (auth.uid() = user_id);

-- qadha_counts
drop policy if exists qadha_select_own on public.qadha_counts;
drop policy if exists qadha_insert_own on public.qadha_counts;
drop policy if exists qadha_update_own on public.qadha_counts;
drop policy if exists qadha_delete_own on public.qadha_counts;
create policy qadha_select_own on public.qadha_counts for select using (auth.uid() = user_id);
create policy qadha_insert_own on public.qadha_counts for insert with check (auth.uid() = user_id);
create policy qadha_update_own on public.qadha_counts for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy qadha_delete_own on public.qadha_counts for delete using (auth.uid() = user_id);

-- ─── auto-provision every NEW signup (this was missing) ──────────────────────
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data ->> 'display_name',
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name',
      split_part(coalesce(new.email, ''), '@', 1)
    ),
    coalesce(
      new.raw_user_meta_data ->> 'avatar_url',
      new.raw_user_meta_data ->> 'picture'
    )
  )
  on conflict (id) do nothing;

  insert into public.user_settings (user_id) values (new.id)
  on conflict (user_id) do nothing;

  insert into public.qadha_counts (user_id, prayer)
  select new.id, p from unnest(enum_range(null::prayer_type)) as p
  on conflict (user_id, prayer) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Keep the profile in step with later Google/email metadata updates.
create or replace function public.handle_user_updated()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles
     set display_name = coalesce(
           new.raw_user_meta_data ->> 'display_name',
           new.raw_user_meta_data ->> 'full_name',
           new.raw_user_meta_data ->> 'name',
           display_name),
         avatar_url = coalesce(
           new.raw_user_meta_data ->> 'avatar_url',
           new.raw_user_meta_data ->> 'picture',
           avatar_url)
   where id = new.id;
  return new;
end;
$$;

drop trigger if exists on_auth_user_updated on auth.users;
create trigger on_auth_user_updated
  after update on auth.users
  for each row execute function public.handle_user_updated();

-- ─── BACKFILL the users who signed up while the trigger was missing ──────────
insert into public.profiles (id, display_name, avatar_url)
select u.id,
       coalesce(
         u.raw_user_meta_data ->> 'display_name',
         u.raw_user_meta_data ->> 'full_name',
         u.raw_user_meta_data ->> 'name',
         split_part(coalesce(u.email, ''), '@', 1)),
       coalesce(
         u.raw_user_meta_data ->> 'avatar_url',
         u.raw_user_meta_data ->> 'picture')
from auth.users u
on conflict (id) do nothing;

insert into public.user_settings (user_id)
select id from auth.users
on conflict (user_id) do nothing;

insert into public.qadha_counts (user_id, prayer)
select u.id, p
from auth.users u, unnest(enum_range(null::prayer_type)) as p
on conflict (user_id, prayer) do nothing;

-- ─── verify ──────────────────────────────────────────────────────────────────
select
  (select count(*) from auth.users)          as auth_users,
  (select count(*) from public.profiles)     as profiles,
  (select count(*) from public.user_settings) as settings_rows,
  (select count(*) from public.qadha_counts)  as qadha_rows;
