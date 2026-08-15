begin;

-- Existing Planner maintenance and materialization verification use the
-- authenticated service path under RLS. Preserve that completed behavior while
-- the normal Administrator UI remains Batch-owned.
grant insert, update on table public.class_schedules to authenticated;

commit;
