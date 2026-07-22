-- =============================================================================
-- Sync the settings that were added after 0002 so a signed-in user's full
-- preferences follow them across devices (previously only a subset synced).
-- Safe to run more than once.
-- =============================================================================

alter table public.user_settings
  add column if not exists pinned_times    boolean not null default true;
alter table public.user_settings
  add column if not exists show_asr_isha   boolean not null default true;
alter table public.user_settings
  add column if not exists show_sun_events boolean not null default true;

-- Prayer-alert sound: 'takbir' (bundled athan) or 'notification' (device tone).
alter table public.user_settings
  add column if not exists athan_mode      text not null default 'takbir'
  check (athan_mode in ('takbir', 'notification'));
alter table public.user_settings
  add column if not exists athan_sound_id  text not null default 'sound1';

-- 'system' is a valid theme choice in the app (follow device).
do $$
begin
  if not exists (
    select 1 from pg_enum e
    join pg_type t on t.oid = e.enumtypid
    where t.typname = 'theme_mode' and e.enumlabel = 'system'
  ) then
    alter type theme_mode add value 'system';
  end if;
end $$;
