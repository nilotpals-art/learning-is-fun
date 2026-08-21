create or replace function public.list_parent_student_schedule(p_student_id uuid,p_days_ahead integer default 14)
returns jsonb
language plpgsql
stable
security definer
set search_path to ''
as $function$
declare
  v_institute_id uuid;
  v_days integer := greatest(coalesce(p_days_ahead,14),1);
  v_results jsonb;
begin
  select p.institute_id
  into v_institute_id
  from public.profiles p
  left join public.roles r on r.id=p.role_id
  where p.id=auth.uid()
    and p.is_active is true
    and coalesce(nullif(btrim(p.role),''),r.name)='Parent';

  if v_institute_id is null
     or not public.fee_parent_can_view_student(v_institute_id,p_student_id) then
    raise exception 'PARENT_UNAUTHORIZED';
  end if;

  with assignment_windows as (
    select sa.batch_id,
           greatest(sa.effective_from,current_date) as from_date,
           least(coalesce(sa.effective_to,current_date+v_days),current_date+v_days) as to_date
    from public.student_assignments sa
    where sa.institute_id=v_institute_id
      and sa.student_id=p_student_id
      and sa.effective_from<=current_date+v_days
      and (sa.effective_to is null or sa.effective_to>=current_date)
  ),
  persisted as (
    select e.id::text as id,
           e.title,
           e.event_date,
           e.start_time,
           e.end_time,
           e.schedule_type::text as schedule_type,
           e.status::text as status,
           sub.subject_name,
           b.name as batch_name,
           e.class_schedule_id
    from public.schedule_events e
    join assignment_windows aw
      on aw.batch_id=e.batch_id
     and e.event_date between aw.from_date and aw.to_date
    left join public.subjects sub
      on sub.id=e.subject_id and sub.institute_id=e.institute_id
    left join public.batches b
      on b.id=e.batch_id and b.institute_id=e.institute_id
    where e.institute_id=v_institute_id
      and e.event_date between current_date and current_date+v_days
      and e.status in ('scheduled','completed')
  ),
  recurring as (
    select ('recurring:'||cs.id::text||':'||d.day::date::text) as id,
           coalesce(sub.subject_name,'CLASS')||' - '||b.name as title,
           d.day::date as event_date,
           cs.start_time,
           cs.end_time,
           'regular_class'::text as schedule_type,
           'scheduled'::text as status,
           sub.subject_name,
           b.name as batch_name,
           cs.id as class_schedule_id
    from public.class_schedules cs
    join assignment_windows aw on aw.batch_id=cs.batch_id
    join public.batches b
      on b.id=cs.batch_id and b.institute_id=cs.institute_id and b.is_active is true
    left join public.subjects sub
      on sub.id=cs.subject_id and sub.institute_id=cs.institute_id
    cross join lateral generate_series(
      greatest(current_date,aw.from_date,cs.effective_from),
      least(current_date+v_days,aw.to_date,coalesce(cs.effective_to,current_date+v_days)),
      interval '1 day'
    ) as d(day)
    where cs.institute_id=v_institute_id
      and cs.is_active is true
      and extract(isodow from d.day)::integer=cs.day_of_week
      and not exists (
        select 1
        from persisted p
        where p.class_schedule_id=cs.id
          and p.event_date=d.day::date
      )
  ),
  combined as (
    select id,title,event_date,start_time,end_time,schedule_type,status,subject_name,batch_name from persisted
    union all
    select id,title,event_date,start_time,end_time,schedule_type,status,subject_name,batch_name from recurring
  )
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id',id,
        'title',title,
        'event_date',event_date,
        'start_time',start_time,
        'end_time',end_time,
        'schedule_type',schedule_type,
        'status',status,
        'subject_name',subject_name,
        'batch_name',batch_name
      ) order by event_date,start_time,id
    ),
    '[]'::jsonb
  ) into v_results
  from combined;

  return v_results;
end;
$function$;

revoke all on function public.list_parent_student_schedule(uuid,integer) from public;
grant execute on function public.list_parent_student_schedule(uuid,integer) to authenticated;
