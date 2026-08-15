begin;

grant execute on function public.generate_schedule_events(date,date,uuid,uuid) to authenticated;
grant execute on function public.create_planner_event(jsonb) to authenticated;

drop function if exists public.create_recurring_occurrence_exception(uuid,date,text,text,boolean,date,time,time,boolean,text);
drop function if exists public.reschedule_exceptional_planner_event(uuid,date,time,time,text,boolean,text);
drop function if exists public.schedule_pending_exception_replacement(uuid,date,time,time,text,boolean,text);
drop function if exists public.create_exceptional_planner_event(jsonb,boolean,text);
drop function if exists public.record_planner_event_overlap_approvals(uuid,uuid,jsonb,date,time,time,text);
drop function if exists public.planner_event_overlap_conflicts(uuid,uuid,uuid,date,time,time,uuid,uuid,date);

drop trigger if exists schedule_events_prevent_routine_materialization on public.schedule_events;
drop function if exists public.prevent_routine_schedule_event_materialization();

drop table if exists public.planner_event_overlap_approvals;

commit;
