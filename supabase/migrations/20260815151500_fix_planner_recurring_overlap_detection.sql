begin;

create or replace function public.planner_event_overlap_conflicts(
  p_institute_id uuid,
  p_branch_id uuid,
  p_batch_id uuid,
  p_event_date date,
  p_start_time time,
  p_end_time time,
  p_exclude_event_id uuid default null,
  p_exclude_class_schedule_id uuid default null,
  p_exclude_occurrence_date date default null
)
returns jsonb
language sql
security definer
set search_path = ''
as $$
  with recurring as (
    select 'recurring_timetable'::text conflict_kind, cs.batch_id,
      b.name batch_name, cs.id class_schedule_id, null::uuid event_id,
      cs.start_time, cs.end_time
    from public.class_schedules cs
    join public.academic_years ay on ay.id=cs.academic_year_id and ay.institute_id=cs.institute_id
    join public.batches b on b.id=cs.batch_id and b.institute_id=cs.institute_id
    where cs.institute_id=p_institute_id
      and cs.is_active is true
      and p_event_date between cs.effective_from and coalesce(cs.effective_to,p_event_date)
      and p_event_date between ay.start_date and ay.end_date
      and extract(isodow from p_event_date)::smallint=cs.day_of_week
      and cs.start_time<p_end_time and cs.end_time>p_start_time
      and (p_branch_id is null or cs.branch_id is null or cs.branch_id=p_branch_id)
      and (
        p_exclude_class_schedule_id is null
        or p_exclude_occurrence_date is null
        or cs.id<>p_exclude_class_schedule_id
        or p_event_date<>p_exclude_occurrence_date
      )
  ), exceptional as (
    select 'exception_event'::text conflict_kind, e.batch_id,
      b.name batch_name, null::uuid class_schedule_id, e.id event_id,
      e.start_time, e.end_time
    from public.schedule_events e
    join public.batches b on b.id=e.batch_id and b.institute_id=e.institute_id
    where e.institute_id=p_institute_id
      and e.id is distinct from p_exclude_event_id
      and e.event_date=p_event_date and e.status='scheduled'
      and e.start_time is not null and e.end_time is not null
      and e.start_time<p_end_time and e.end_time>p_start_time
      and (p_branch_id is null or e.branch_id is null or e.branch_id=p_branch_id)
  ), conflicts as (
    select * from recurring union all select * from exceptional
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'kind',conflict_kind,'sameBatch',batch_id=p_batch_id,
    'batchId',batch_id,'batchName',batch_name,
    'classScheduleId',class_schedule_id,'eventId',event_id,
    'date',p_event_date,'startTime',to_char(start_time,'HH24:MI'),
    'endTime',to_char(end_time,'HH24:MI')
  ) order by batch_name,start_time),'[]'::jsonb) from conflicts;
$$;

revoke all on function public.planner_event_overlap_conflicts(uuid,uuid,uuid,date,time,time,uuid,uuid,date)
  from public, anon, authenticated;

commit;
