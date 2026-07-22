-- =============================================================================
-- REPAIR — STEP 1 of 2  (run this FIRST, on its own, then run step 2)
--
-- Postgres will not let a newly added enum value be USED in the same
-- transaction that added it, so the enum work must be committed separately.
-- Both steps are idempotent — safe to run again at any time.
-- =============================================================================

-- Base types (no-ops if they already exist).
do $$ begin
  create type prayer_type as enum ('fajr','dhuhr','asr','maghrib','isha');
exception when duplicate_object then null; end $$;

do $$ begin
  create type prayer_status as enum ('on_time','late','qadha','missed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type theme_mode as enum ('light','dark');
exception when duplicate_object then null; end $$;

do $$ begin
  create type app_language as enum ('en','ar');
exception when duplicate_object then null; end $$;

do $$ begin
  create type qadha_action as enum ('increment','decrement','set','reset');
exception when duplicate_object then null; end $$;

-- Values added by later app versions.
do $$ begin
  if not exists (select 1 from pg_enum e join pg_type t on t.oid = e.enumtypid
                 where t.typname = 'prayer_type' and e.enumlabel = 'ayat') then
    alter type prayer_type add value 'ayat';
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_enum e join pg_type t on t.oid = e.enumtypid
                 where t.typname = 'theme_mode' and e.enumlabel = 'system') then
    alter type theme_mode add value 'system';
  end if;
end $$;

-- ✅ Step 1 done. Now run 0004_repair_step2_schema.sql
