-- =============================================================================
-- Reconcile the schema with the mobile app's data model.
--   * qadha tracker now stores BOTH the total missed and how many were made up
--   * adds "ayat" (Salat al-Ayat) to the tracked prayers
--   * adds the extra client settings (motivation, daily Quran, selected city)
-- Safe to run after 0001_init.sql.
-- =============================================================================

-- 1. Add Salat al-Ayat to the prayer enum (no-op if already present).
do $$
begin
  if not exists (
    select 1 from pg_enum e
    join pg_type t on t.oid = e.enumtypid
    where t.typname = 'prayer_type' and e.enumlabel = 'ayat'
  ) then
    alter type prayer_type add value 'ayat';
  end if;
end $$;

-- 2. Track made-up prayers alongside the missed total.
--    `count` keeps its meaning = total missed; `completed` = made up so far.
alter table public.qadha_counts
  add column if not exists completed integer not null default 0 check (completed >= 0);

-- 3. Extra client settings.
alter table public.user_settings
  add column if not exists motivation  boolean not null default true;
alter table public.user_settings
  add column if not exists quran_daily boolean not null default true;
alter table public.user_settings
  add column if not exists location_id text not null default 'iq-najaf';
