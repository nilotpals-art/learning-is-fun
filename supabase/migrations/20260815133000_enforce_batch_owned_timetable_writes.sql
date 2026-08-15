begin;

-- Final state: authenticated clients may read recurring schedules, while all
-- writes flow through the security-definer Batch timetable RPCs.
revoke insert, update, delete on table public.class_schedules from authenticated;
grant select on table public.class_schedules to authenticated;

commit;
