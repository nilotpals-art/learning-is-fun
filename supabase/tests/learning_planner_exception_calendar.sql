-- Rollback-controlled verification for the exception-based Planner Calendar.
begin;

do $$
begin
  if not exists (
    select 1 from pg_trigger
    where tgrelid = 'public.schedule_events'::regclass
      and tgname = 'schedule_events_prevent_routine_materialization'
  ) then raise exception 'Routine materialization guard is missing'; end if;
  if has_function_privilege('authenticated', 'public.generate_schedule_events(date,date,uuid,uuid)', 'EXECUTE') then
    raise exception 'Legacy materialization RPC remains executable';
  end if;
  if not (select relrowsecurity from pg_class where oid = 'public.planner_event_overlap_approvals'::regclass) then
    raise exception 'Overlap approvals RLS is not enabled';
  end if;
  if has_table_privilege('anon', 'public.planner_event_overlap_approvals', 'SELECT') then
    raise exception 'Anonymous overlap audit access must be denied';
  end if;
  if not has_function_privilege('authenticated', 'public.create_exceptional_planner_event(jsonb,boolean,text)', 'EXECUTE')
     or not has_function_privilege('authenticated', 'public.create_recurring_occurrence_exception(uuid,date,text,text,boolean,date,time,time,boolean,text)', 'EXECUTE') then
    raise exception 'Exception lifecycle RPC grants are missing';
  end if;
end $$;

do $$
declare
  v_admin public.profiles%rowtype;
  v_year public.academic_years%rowtype;
  v_batch public.batches%rowtype;
  v_schedule_id uuid;
  v_date date;
  v_result jsonb;
  v_source public.schedule_events%rowtype;
  v_replacement public.schedule_events%rowtype;
begin
  select * into v_admin from public.profiles
  where is_active is true and role in ('Administrator','Super Admin','admin','Institute Admin')
  order by case when role='Super Admin' then 0 else 1 end, created_at limit 1;
  select * into v_year from public.academic_years
  where institute_id=v_admin.institute_id and start_date<=current_date and end_date>=current_date
  order by is_current desc limit 1;
  select * into v_batch from public.batches
  where institute_id=v_admin.institute_id and is_active is true limit 1;
  if v_admin.id is null or v_year.id is null or v_batch.id is null then
    raise exception 'Exception Calendar test prerequisites are unavailable';
  end if;

  v_date := greatest(current_date, v_year.start_date) + 8;
  while extract(isodow from v_date)::integer <> 1 loop v_date := v_date + 1; end loop;
  if v_date > v_year.end_date then raise exception 'No test date within Academic Year'; end if;

  insert into public.class_schedules(
    institute_id,branch_id,academic_year_id,batch_id,subject_id,day_of_week,
    start_time,end_time,schedule_type,effective_from,effective_to,is_active,created_by
  ) values (
    v_admin.institute_id,v_batch.branch_id,v_year.id,v_batch.id,v_batch.subject_id,1,
    '04:01','04:31','regular_class',v_date,v_date,true,v_admin.id
  ) returning id into v_schedule_id;

  begin
    insert into public.schedule_events(
      institute_id,branch_id,academic_year_id,batch_id,class_schedule_id,subject_id,
      event_date,start_time,end_time,schedule_type,status,title,notification_required,created_by
    ) values (
      v_admin.institute_id,v_batch.branch_id,v_year.id,v_batch.id,v_schedule_id,v_batch.subject_id,
      v_date,'04:01','04:31','regular_class','scheduled','FORBIDDEN ROUTINE ROW',false,v_admin.id
    );
    raise exception 'Routine regular_class materialization was allowed';
  exception when others then
    if sqlerrm not like '%PLANNER_ROUTINE_MATERIALIZATION_DISABLED%' then raise; end if;
  end;

  perform set_config('request.jwt.claim.sub',v_admin.id::text,true);
  v_result := public.create_recurring_occurrence_exception(
    v_schedule_id,v_date,'reschedule','EXCEPTION CALENDAR SQL TEST',false,
    v_date,'04:31','05:01',false,null
  );
  if v_result->>'status' <> 'success' then raise exception 'Derived reschedule failed: %',v_result; end if;

  select * into v_replacement from public.schedule_events where id=(v_result->>'id')::uuid;
  select * into v_source from public.schedule_events where id=(v_result->>'sourceId')::uuid;
  if v_source.status <> 'rescheduled' or v_source.class_schedule_id <> v_schedule_id
     or v_source.event_date <> v_date or v_replacement.original_event_id <> v_source.id then
    raise exception 'Derived occurrence history/linkage is invalid';
  end if;
  if not exists (
    select 1 from public.schedule_changes
    where schedule_event_id in (v_source.id,v_replacement.id)
  ) then raise exception 'Lifecycle audit rows are missing'; end if;

  begin
    perform public.create_recurring_occurrence_exception(
      v_schedule_id,v_date,'cancel','DUPLICATE SOURCE TEST',false,null,null,null,false,null
    );
    raise exception 'Duplicate source identity was accepted';
  exception when others then
    if sqlerrm not like '%PLANNER_OCCURRENCE_ALREADY_PERSISTED%' then raise; end if;
  end;
end $$;

rollback;
