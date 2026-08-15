begin;

revoke insert, update on table public.class_schedules from authenticated;

commit;
