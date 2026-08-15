begin;

create table public.planner_event_overlap_approvals (
  id uuid primary key default gen_random_uuid(),
  institute_id uuid not null references public.institutes(id) on delete restrict,
  branch_id uuid null references public.branches(id) on delete restrict,
  event_id uuid not null references public.schedule_events(id) on delete restrict,
  source_event_id uuid null references public.schedule_events(id) on delete restrict,
  conflict_kind text not null check (conflict_kind in ('recurring_timetable','exception_event')),
  conflicting_batch_id uuid not null references public.batches(id) on delete restrict,
  conflicting_class_schedule_id uuid null references public.class_schedules(id) on delete restrict,
  conflicting_event_id uuid null references public.schedule_events(id) on delete restrict,
  event_date date not null,
  proposed_start_time time not null,
  proposed_end_time time not null,
  conflicting_start_time time not null,
  conflicting_end_time time not null,
  reason text not null check (btrim(reason) <> ''),
  approved_by uuid not null references public.profiles(id) on delete restrict,
  approved_at timestamptz not null default now(),
  check (
    (conflict_kind = 'recurring_timetable' and conflicting_class_schedule_id is not null)
    or (conflict_kind = 'exception_event' and conflicting_event_id is not null)
  )
);

create index planner_event_overlap_scope_idx
  on public.planner_event_overlap_approvals(institute_id, branch_id, approved_at desc);
create index planner_event_overlap_event_idx
  on public.planner_event_overlap_approvals(event_id);

alter table public.planner_event_overlap_approvals enable row level security;
revoke all on public.planner_event_overlap_approvals from public, anon, authenticated;
grant select on public.planner_event_overlap_approvals to authenticated;

create policy planner_event_overlap_admin_select
on public.planner_event_overlap_approvals
for select to authenticated
using (public.learning_planner_admin_scope(institute_id, branch_id));

create or replace function public.prevent_routine_schedule_event_materialization()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.schedule_type = 'regular_class'
     and new.class_schedule_id is not null
     and new.original_event_id is null
     and new.status in ('scheduled','completed')
     and coalesce(current_setting('app.planner_exception_write', true), '') <> 'on' then
    raise exception 'PLANNER_ROUTINE_MATERIALIZATION_DISABLED';
  end if;
  return new;
end;
$$;

drop trigger if exists schedule_events_prevent_routine_materialization on public.schedule_events;
create trigger schedule_events_prevent_routine_materialization
before insert or update of status, class_schedule_id, original_event_id
on public.schedule_events
for each row execute function public.prevent_routine_schedule_event_materialization();

revoke execute on function public.generate_schedule_events(date,date,uuid,uuid) from public, anon, authenticated;

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
    select
      'recurring_timetable'::text as conflict_kind,
      cs.batch_id,
      b.name as batch_name,
      cs.id as class_schedule_id,
      null::uuid as event_id,
      cs.start_time,
      cs.end_time
    from public.class_schedules cs
    join public.academic_years ay
      on ay.id = cs.academic_year_id and ay.institute_id = cs.institute_id
    join public.batches b
      on b.id = cs.batch_id and b.institute_id = cs.institute_id
    where cs.institute_id = p_institute_id
      and cs.is_active is true
      and p_event_date between cs.effective_from and coalesce(cs.effective_to, p_event_date)
      and p_event_date between ay.start_date and ay.end_date
      and extract(isodow from p_event_date)::smallint = cs.day_of_week
      and cs.start_time < p_end_time
      and cs.end_time > p_start_time
      and (p_branch_id is null or cs.branch_id is null or cs.branch_id = p_branch_id)
      and not (
        cs.id = p_exclude_class_schedule_id
        and p_event_date = p_exclude_occurrence_date
      )
  ),
  exceptional as (
    select
      'exception_event'::text as conflict_kind,
      e.batch_id,
      b.name as batch_name,
      null::uuid as class_schedule_id,
      e.id as event_id,
      e.start_time,
      e.end_time
    from public.schedule_events e
    join public.batches b
      on b.id = e.batch_id and b.institute_id = e.institute_id
    where e.institute_id = p_institute_id
      and e.id is distinct from p_exclude_event_id
      and e.event_date = p_event_date
      and e.status = 'scheduled'
      and e.start_time is not null
      and e.end_time is not null
      and e.start_time < p_end_time
      and e.end_time > p_start_time
      and (p_branch_id is null or e.branch_id is null or e.branch_id = p_branch_id)
  ),
  conflicts as (
    select * from recurring
    union all
    select * from exceptional
  )
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'kind', conflict_kind,
        'sameBatch', batch_id = p_batch_id,
        'batchId', batch_id,
        'batchName', batch_name,
        'classScheduleId', class_schedule_id,
        'eventId', event_id,
        'date', p_event_date,
        'startTime', to_char(start_time, 'HH24:MI'),
        'endTime', to_char(end_time, 'HH24:MI')
      )
      order by batch_name, start_time
    ),
    '[]'::jsonb
  )
  from conflicts;
$$;

revoke all on function public.planner_event_overlap_conflicts(uuid,uuid,uuid,date,time,time,uuid,uuid,date)
  from public, anon, authenticated;

create or replace function public.record_planner_event_overlap_approvals(
  p_event_id uuid,
  p_source_event_id uuid,
  p_conflicts jsonb,
  p_event_date date,
  p_start_time time,
  p_end_time time,
  p_reason text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_profile public.profiles%rowtype;
  v_event public.schedule_events%rowtype;
  v_conflict jsonb;
begin
  select * into v_profile from public.profiles
  where id = (select auth.uid()) and is_active is true
    and role in ('Administrator','Super Admin','admin','Institute Admin');
  select * into v_event from public.schedule_events
  where id = p_event_id and institute_id = v_profile.institute_id;
  if v_profile.id is null or v_event.id is null or btrim(coalesce(p_reason,'')) = '' then
    raise exception 'PLANNER_OVERLAP_APPROVAL_INVALID';
  end if;
  for v_conflict in select value from jsonb_array_elements(p_conflicts)
  loop
    if coalesce((v_conflict->>'sameBatch')::boolean, false) then
      raise exception 'PLANNER_BATCH_CONFLICT';
    end if;
    insert into public.planner_event_overlap_approvals(
      institute_id, branch_id, event_id, source_event_id, conflict_kind,
      conflicting_batch_id, conflicting_class_schedule_id, conflicting_event_id,
      event_date, proposed_start_time, proposed_end_time,
      conflicting_start_time, conflicting_end_time, reason, approved_by
    ) values (
      v_event.institute_id, v_event.branch_id, v_event.id, p_source_event_id,
      v_conflict->>'kind', (v_conflict->>'batchId')::uuid,
      nullif(v_conflict->>'classScheduleId','')::uuid,
      nullif(v_conflict->>'eventId','')::uuid,
      p_event_date, p_start_time, p_end_time,
      (v_conflict->>'startTime')::time, (v_conflict->>'endTime')::time,
      upper(btrim(p_reason)), v_profile.id
    );
  end loop;
end;
$$;

revoke all on function public.record_planner_event_overlap_approvals(uuid,uuid,jsonb,date,time,time,text)
  from public, anon, authenticated;

create or replace function public.create_exceptional_planner_event(
  p_input jsonb,
  p_approve_overlap boolean default false,
  p_overlap_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_profile public.profiles%rowtype;
  v_batch public.batches%rowtype;
  v_conflicts jsonb;
  v_result jsonb;
  v_event_id uuid;
  v_date date;
  v_start time;
  v_end time;
begin
  select * into v_profile from public.profiles
  where id = (select auth.uid()) and is_active is true
    and role in ('Administrator','Super Admin','admin','Institute Admin');
  if v_profile.id is null then raise exception 'PLANNER_UNAUTHORIZED'; end if;
  if p_input->>'scheduleType' = 'regular_class' then
    raise exception 'PLANNER_REGULAR_CLASS_EXPLICIT_DISABLED';
  end if;
  select * into v_batch from public.batches
  where id = nullif(p_input->>'batchId','')::uuid
    and institute_id = v_profile.institute_id and is_active is true;
  v_date := (p_input->>'eventDate')::date;
  v_start := nullif(p_input->>'startTime','')::time;
  v_end := nullif(p_input->>'endTime','')::time;
  if v_batch.id is not null and v_start is not null and v_end is not null then
    v_conflicts := public.planner_event_overlap_conflicts(
      v_profile.institute_id, coalesce(nullif(p_input->>'branchId','')::uuid,v_batch.branch_id),
      v_batch.id, v_date, v_start, v_end, null, null, null
    );
    if exists(select 1 from jsonb_array_elements(v_conflicts) c where (c->>'sameBatch')::boolean) then
      raise exception 'PLANNER_BATCH_CONFLICT';
    end if;
    if jsonb_array_length(v_conflicts) > 0 and not p_approve_overlap then
      return jsonb_build_object('status','conflict','conflicts',v_conflicts);
    end if;
    if jsonb_array_length(v_conflicts) > 0 and btrim(coalesce(p_overlap_reason,'')) = '' then
      raise exception 'PLANNER_OVERLAP_REASON_REQUIRED';
    end if;
  else
    v_conflicts := '[]'::jsonb;
  end if;
  v_result := public.create_planner_event(p_input);
  v_event_id := (v_result->>'id')::uuid;
  if jsonb_array_length(v_conflicts) > 0 then
    perform public.record_planner_event_overlap_approvals(
      v_event_id, null, v_conflicts, v_date, v_start, v_end, p_overlap_reason
    );
  end if;
  return jsonb_build_object('status','success','id',v_event_id,'event',v_result);
end;
$$;

create or replace function public.create_recurring_occurrence_exception(
  p_class_schedule_id uuid,
  p_occurrence_date date,
  p_action text,
  p_reason text,
  p_reschedule_pending boolean default false,
  p_new_date date default null,
  p_new_start_time time default null,
  p_new_end_time time default null,
  p_approve_overlap boolean default false,
  p_overlap_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_profile public.profiles%rowtype;
  v_schedule record;
  v_source_id uuid;
  v_result jsonb;
  v_conflicts jsonb := '[]'::jsonb;
  v_new_id uuid;
begin
  select * into v_profile from public.profiles
  where id = (select auth.uid()) and is_active is true
    and role in ('Administrator','Super Admin','admin','Institute Admin');
  select cs.*, b.name batch_name, b.subject_id batch_subject_id
  into v_schedule
  from public.class_schedules cs
  join public.batches b on b.id=cs.batch_id and b.institute_id=cs.institute_id
  join public.academic_years ay on ay.id=cs.academic_year_id and ay.institute_id=cs.institute_id
  where cs.id=p_class_schedule_id and cs.institute_id=v_profile.institute_id
    and cs.is_active is true
    and p_occurrence_date between cs.effective_from and coalesce(cs.effective_to,p_occurrence_date)
    and p_occurrence_date between ay.start_date and ay.end_date
    and extract(isodow from p_occurrence_date)::smallint=cs.day_of_week
    and (v_profile.branch_id is null or cs.branch_id=v_profile.branch_id);
  if v_profile.id is null or v_schedule.id is null then raise exception 'PLANNER_OCCURRENCE_NOT_FOUND'; end if;
  if p_action not in ('cancel','reschedule') then raise exception 'PLANNER_OCCURRENCE_ACTION_INVALID'; end if;
  if btrim(coalesce(p_reason,'')) = '' then raise exception 'PLANNER_REASON_REQUIRED'; end if;
  if exists(
    select 1 from public.schedule_events
    where class_schedule_id=p_class_schedule_id and event_date=p_occurrence_date
      and original_event_id is null
  ) then raise exception 'PLANNER_OCCURRENCE_ALREADY_PERSISTED'; end if;

  if p_action='reschedule' then
    if p_new_date is null or p_new_start_time is null or p_new_end_time is null
       or p_new_end_time <= p_new_start_time then
      raise exception 'PLANNER_EVENT_TIME_INVALID';
    end if;
    v_conflicts := public.planner_event_overlap_conflicts(
      v_schedule.institute_id, v_schedule.branch_id, v_schedule.batch_id,
      p_new_date, p_new_start_time, p_new_end_time, null,
      case when p_new_date=p_occurrence_date then p_class_schedule_id else null end,
      case when p_new_date=p_occurrence_date then p_occurrence_date else null end
    );
    if exists(select 1 from jsonb_array_elements(v_conflicts) c where (c->>'sameBatch')::boolean) then
      raise exception 'PLANNER_BATCH_CONFLICT';
    end if;
    if jsonb_array_length(v_conflicts)>0 and not p_approve_overlap then
      return jsonb_build_object('status','conflict','conflicts',v_conflicts);
    end if;
    if jsonb_array_length(v_conflicts)>0 and btrim(coalesce(p_overlap_reason,''))='' then
      raise exception 'PLANNER_OVERLAP_REASON_REQUIRED';
    end if;
  end if;

  perform set_config('app.planner_exception_write','on',true);
  insert into public.schedule_events(
    institute_id,branch_id,academic_year_id,batch_id,class_schedule_id,subject_id,
    event_date,start_time,end_time,schedule_type,status,title,room,
    notification_required,created_by
  ) values (
    v_schedule.institute_id,v_schedule.branch_id,v_schedule.academic_year_id,
    v_schedule.batch_id,v_schedule.id,coalesce(v_schedule.subject_id,v_schedule.batch_subject_id),
    p_occurrence_date,v_schedule.start_time,v_schedule.end_time,'regular_class',
    'scheduled',upper(coalesce(v_schedule.batch_name,'REGULAR CLASS')),v_schedule.room,
    true,v_profile.id
  ) returning id into v_source_id;

  if p_action='cancel' then
    v_result := public.cancel_planner_event(v_source_id,p_reason,p_reschedule_pending);
    return jsonb_build_object('status','success','id',v_source_id,'event',v_result);
  end if;

  v_result := public.reschedule_schedule_event(
    v_source_id,p_new_date,p_new_start_time,p_new_end_time,p_reason
  );
  v_new_id := (v_result->>'id')::uuid;
  if jsonb_array_length(v_conflicts)>0 then
    perform public.record_planner_event_overlap_approvals(
      v_new_id,v_source_id,v_conflicts,p_new_date,p_new_start_time,p_new_end_time,p_overlap_reason
    );
  end if;
  return jsonb_build_object('status','success','id',v_new_id,'sourceId',v_source_id,'event',v_result);
end;
$$;

create or replace function public.reschedule_exceptional_planner_event(
  p_event_id uuid,
  p_new_date date,
  p_new_start_time time,
  p_new_end_time time,
  p_reason text,
  p_approve_overlap boolean default false,
  p_overlap_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_profile public.profiles%rowtype;
  v_old public.schedule_events%rowtype;
  v_conflicts jsonb;
  v_result jsonb;
  v_new_id uuid;
begin
  select * into v_profile from public.profiles
  where id=(select auth.uid()) and is_active is true
    and role in ('Administrator','Super Admin','admin','Institute Admin');
  select * into v_old from public.schedule_events
  where id=p_event_id and institute_id=v_profile.institute_id;
  if v_profile.id is null or v_old.id is null then raise exception 'PLANNER_EVENT_NOT_FOUND'; end if;
  v_conflicts:=public.planner_event_overlap_conflicts(
    v_old.institute_id,v_old.branch_id,v_old.batch_id,p_new_date,p_new_start_time,p_new_end_time,
    v_old.id,
    case when p_new_date=v_old.event_date then v_old.class_schedule_id else null end,
    case when p_new_date=v_old.event_date then v_old.event_date else null end
  );
  if exists(select 1 from jsonb_array_elements(v_conflicts)c where (c->>'sameBatch')::boolean)
  then raise exception 'PLANNER_BATCH_CONFLICT'; end if;
  if jsonb_array_length(v_conflicts)>0 and not p_approve_overlap then
    return jsonb_build_object('status','conflict','conflicts',v_conflicts);
  end if;
  if jsonb_array_length(v_conflicts)>0 and btrim(coalesce(p_overlap_reason,''))='' then
    raise exception 'PLANNER_OVERLAP_REASON_REQUIRED';
  end if;
  v_result:=public.reschedule_schedule_event(
    p_event_id,p_new_date,p_new_start_time,p_new_end_time,p_reason
  );
  v_new_id:=(v_result->>'id')::uuid;
  if jsonb_array_length(v_conflicts)>0 then
    perform public.record_planner_event_overlap_approvals(
      v_new_id,p_event_id,v_conflicts,p_new_date,p_new_start_time,p_new_end_time,p_overlap_reason
    );
  end if;
  return jsonb_build_object('status','success','id',v_new_id,'event',v_result);
end;
$$;

create or replace function public.schedule_pending_exception_replacement(
  p_event_id uuid,
  p_new_date date,
  p_new_start_time time,
  p_new_end_time time,
  p_reason text,
  p_approve_overlap boolean default false,
  p_overlap_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_profile public.profiles%rowtype;
  v_old public.schedule_events%rowtype;
  v_conflicts jsonb;
  v_result jsonb;
  v_new_id uuid;
begin
  select * into v_profile from public.profiles
  where id=(select auth.uid()) and is_active is true
    and role in ('Administrator','Super Admin','admin','Institute Admin');
  select * into v_old from public.schedule_events
  where id=p_event_id and institute_id=v_profile.institute_id
    and status='cancelled' and reschedule_pending is true;
  if v_profile.id is null or v_old.id is null then raise exception 'PLANNER_PENDING_EVENT_NOT_FOUND'; end if;
  v_conflicts:=public.planner_event_overlap_conflicts(
    v_old.institute_id,v_old.branch_id,v_old.batch_id,p_new_date,p_new_start_time,p_new_end_time,
    v_old.id,
    case when p_new_date=v_old.event_date then v_old.class_schedule_id else null end,
    case when p_new_date=v_old.event_date then v_old.event_date else null end
  );
  if exists(select 1 from jsonb_array_elements(v_conflicts)c where (c->>'sameBatch')::boolean)
  then raise exception 'PLANNER_BATCH_CONFLICT'; end if;
  if jsonb_array_length(v_conflicts)>0 and not p_approve_overlap then
    return jsonb_build_object('status','conflict','conflicts',v_conflicts);
  end if;
  if jsonb_array_length(v_conflicts)>0 and btrim(coalesce(p_overlap_reason,''))='' then
    raise exception 'PLANNER_OVERLAP_REASON_REQUIRED';
  end if;
  v_result:=public.schedule_pending_replacement(
    p_event_id,p_new_date,p_new_start_time,p_new_end_time,p_reason
  );
  v_new_id:=(v_result->>'id')::uuid;
  if jsonb_array_length(v_conflicts)>0 then
    perform public.record_planner_event_overlap_approvals(
      v_new_id,p_event_id,v_conflicts,p_new_date,p_new_start_time,p_new_end_time,p_overlap_reason
    );
  end if;
  return jsonb_build_object('status','success','id',v_new_id,'event',v_result);
end;
$$;

revoke all on function public.create_exceptional_planner_event(jsonb,boolean,text) from public, anon;
revoke all on function public.create_recurring_occurrence_exception(uuid,date,text,text,boolean,date,time,time,boolean,text) from public, anon;
revoke all on function public.reschedule_exceptional_planner_event(uuid,date,time,time,text,boolean,text) from public, anon;
revoke all on function public.schedule_pending_exception_replacement(uuid,date,time,time,text,boolean,text) from public, anon;
grant execute on function public.create_exceptional_planner_event(jsonb,boolean,text) to authenticated;
grant execute on function public.create_recurring_occurrence_exception(uuid,date,text,text,boolean,date,time,time,boolean,text) to authenticated;
grant execute on function public.reschedule_exceptional_planner_event(uuid,date,time,time,text,boolean,text) to authenticated;
grant execute on function public.schedule_pending_exception_replacement(uuid,date,time,time,text,boolean,text) to authenticated;

revoke execute on function public.create_planner_event(jsonb) from public, anon, authenticated;

commit;
