begin;

-- Recurring timetable mutations are owned by the validated Batch RPCs. Removing
-- direct table writes prevents clients from bypassing overlap review/audit.
revoke insert, update, delete on table public.class_schedules from authenticated;
grant select on table public.class_schedules to authenticated;

commit;
