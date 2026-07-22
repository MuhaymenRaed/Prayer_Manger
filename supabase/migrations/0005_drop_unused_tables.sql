-- =============================================================================
-- Drop tables no app code references (verified: they appear only in SQL).
--
--   user_locations     → the chosen city lives in user_settings.location_id
--   prayer_logs        → daily per-prayer logging was never built
--   qadha_adjustments  → audit trail of tracker changes was never built
--   devices            → push tokens; the app uses local notifications only
--
-- The live schema is therefore exactly: profiles, user_settings, qadha_counts.
-- Run AFTER 0004_repair_step2_schema.sql.
-- =============================================================================

drop table if exists public.user_locations    cascade;
drop table if exists public.prayer_logs       cascade;
drop table if exists public.qadha_adjustments cascade;
drop table if exists public.devices           cascade;

-- prayer_status / qadha_action existed only for the dropped tables.
drop type if exists prayer_status;
drop type if exists qadha_action;

-- ─── verify: should list exactly profiles, qadha_counts, user_settings ───────
select table_name
from information_schema.tables
where table_schema = 'public'
order by table_name;
