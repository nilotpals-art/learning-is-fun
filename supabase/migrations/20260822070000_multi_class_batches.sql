create table if not exists public.batch_classes (
  batch_id uuid not null references public.batches(id) on delete cascade,
  institute_id uuid not null references public.institutes(id) on delete cascade,
  class_id uuid not null references public.academic_classes(id) on delete restrict,
  created_at timestamptz not null default now(),
  primary key (batch_id, class_id)
);

create index if not exists batch_classes_institute_idx on public.batch_classes(institute_id);
create index if not exists batch_classes_class_idx on public.batch_classes(class_id);

alter table public.batch_classes enable row level security;

drop policy if exists batch_classes_select on public.batch_classes;
create policy batch_classes_select on public.batch_classes for select to authenticated
using (exists(select 1 from public.profiles p where p.id=auth.uid() and p.is_active is true and p.institute_id=batch_classes.institute_id));

drop policy if exists batch_classes_admin_insert on public.batch_classes;
create policy batch_classes_admin_insert on public.batch_classes for insert to authenticated
with check (exists(select 1 from public.profiles p left join public.roles r on r.id=p.role_id where p.id=auth.uid() and p.is_active is true and p.institute_id=batch_classes.institute_id and coalesce(nullif(btrim(p.role),''),r.name) in ('Administrator','admin','Super Admin','Institute Admin')));

drop policy if exists batch_classes_admin_delete on public.batch_classes;
create policy batch_classes_admin_delete on public.batch_classes for delete to authenticated
using (exists(select 1 from public.profiles p left join public.roles r on r.id=p.role_id where p.id=auth.uid() and p.is_active is true and p.institute_id=batch_classes.institute_id and coalesce(nullif(btrim(p.role),''),r.name) in ('Administrator','admin','Super Admin','Institute Admin')));

insert into public.batch_classes(batch_id,institute_id,class_id)
select b.id,b.institute_id,b.class_id from public.batches b where b.class_id is not null
on conflict do nothing;

create or replace function public.create_teaching_batch(p_input jsonb, p_approve_overlap boolean default false)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_profile public.profiles%rowtype;
  v_batch public.batches%rowtype;
  v_group jsonb;
  v_day text;
  v_schedule_id uuid;
  v_conflict record;
  v_conflicts jsonb := '[]'::jsonb;
  v_created jsonb := '[]'::jsonb;
  v_board_ids uuid[];
  v_primary_board_id uuid;
  v_class_ids uuid[];
  v_primary_class_id uuid;
begin
  select * into v_profile from public.profiles
  where id=(select auth.uid()) and is_active is true
    and role in ('Administrator','Super Admin','admin','Institute Admin');
  if v_profile.id is null or v_profile.institute_id is null then raise exception 'BATCH_UNAUTHORIZED'; end if;

  if v_profile.branch_id is not null and nullif(p_input->>'branchId','')::uuid is distinct from v_profile.branch_id then raise exception 'BATCH_BRANCH_INVALID'; end if;
  if not exists(select 1 from public.academic_years where id=(p_input->>'academicYearId')::uuid and institute_id=v_profile.institute_id and is_active is true) then raise exception 'BATCH_ACADEMIC_YEAR_INVALID'; end if;

  select array_agg(x.board_id order by x.board_id) into v_board_ids
  from (select distinct value::uuid as board_id from jsonb_array_elements_text(case when jsonb_typeof(p_input->'boardIds')='array' then p_input->'boardIds' when nullif(p_input->>'boardId','') is not null then jsonb_build_array(p_input->>'boardId') else '[]'::jsonb end)) x;
  if coalesce(array_length(v_board_ids,1),0)=0 then raise exception 'BATCH_BOARD_REQUIRED'; end if;
  if (select count(*) from public.boards b where b.institute_id=v_profile.institute_id and b.id=any(v_board_ids)) <> array_length(v_board_ids,1) then raise exception 'BATCH_BOARD_INVALID'; end if;
  v_primary_board_id := v_board_ids[1];

  select array_agg(x.class_id order by x.class_id) into v_class_ids
  from (select distinct value::uuid as class_id from jsonb_array_elements_text(case when jsonb_typeof(p_input->'classIds')='array' then p_input->'classIds' when nullif(p_input->>'classId','') is not null then jsonb_build_array(p_input->>'classId') else '[]'::jsonb end)) x;
  if coalesce(array_length(v_class_ids,1),0)=0 then raise exception 'BATCH_CLASS_REQUIRED'; end if;
  if (select count(*) from public.academic_classes c where c.institute_id=v_profile.institute_id and c.id=any(v_class_ids)) <> array_length(v_class_ids,1) then raise exception 'BATCH_CLASS_INVALID'; end if;
  v_primary_class_id := v_class_ids[1];

  if not exists(select 1 from public.subjects where id=(p_input->>'subjectId')::uuid and institute_id=v_profile.institute_id) then raise exception 'BATCH_SUBJECT_INVALID'; end if;
  if jsonb_array_length(coalesce(p_input->'schedules','[]'::jsonb))=0 then raise exception 'BATCH_SCHEDULE_REQUIRED'; end if;

  perform pg_advisory_xact_lock(hashtextextended(v_profile.institute_id::text||'|BATCH|'||upper(btrim(p_input->>'name')),0));
  if exists(select 1 from public.batches b where b.institute_id=v_profile.institute_id and b.branch_id is not distinct from nullif(p_input->>'branchId','')::uuid and b.academic_year_id=(p_input->>'academicYearId')::uuid and b.board_id=v_primary_board_id and b.class_id=v_primary_class_id and b.subject_id=(p_input->>'subjectId')::uuid and upper(btrim(b.name))=upper(btrim(p_input->>'name')) and b.is_active is true) then raise exception 'BATCH_DUPLICATE_IDENTITY'; end if;

  for v_group in select value from jsonb_array_elements(p_input->'schedules') loop
    if (v_group->>'endTime')::time <= (v_group->>'startTime')::time or jsonb_array_length(coalesce(v_group->'days','[]'))=0 then raise exception 'BATCH_SCHEDULE_INVALID'; end if;
    for v_day in select jsonb_array_elements_text(v_group->'days') loop
      for v_conflict in select cs.id schedule_id,cs.batch_id,b.name batch_name,cs.day_of_week,cs.start_time,cs.end_time from public.class_schedules cs join public.batches b on b.id=cs.batch_id and b.institute_id=cs.institute_id where cs.institute_id=v_profile.institute_id and cs.branch_id is not distinct from nullif(p_input->>'branchId','')::uuid and cs.day_of_week=v_day::smallint and cs.is_active is true and cs.start_time<(v_group->>'endTime')::time and cs.end_time>(v_group->>'startTime')::time loop
        v_conflicts:=v_conflicts||jsonb_build_array(jsonb_build_object('scheduleId',v_conflict.schedule_id,'batchId',v_conflict.batch_id,'batchName',v_conflict.batch_name,'dayOfWeek',v_conflict.day_of_week,'existingStartTime',to_char(v_conflict.start_time,'HH24:MI'),'existingEndTime',to_char(v_conflict.end_time,'HH24:MI'),'proposedStartTime',v_group->>'startTime','proposedEndTime',v_group->>'endTime'));
      end loop;
    end loop;
  end loop;
  if jsonb_array_length(v_conflicts)>0 and not p_approve_overlap then return jsonb_build_object('status','conflict','conflicts',v_conflicts); end if;

  insert into public.batches(institute_id,branch_id,academic_year_id,board_id,class_id,subject_id,name,is_active)
  values(v_profile.institute_id,nullif(p_input->>'branchId','')::uuid,(p_input->>'academicYearId')::uuid,v_primary_board_id,v_primary_class_id,(p_input->>'subjectId')::uuid,upper(btrim(p_input->>'name')),true)
  returning * into v_batch;

  insert into public.batch_boards(batch_id,institute_id,board_id,class_id)
  select v_batch.id,v_batch.institute_id,board_id,v_primary_class_id from unnest(v_board_ids) board_id;
  insert into public.batch_classes(batch_id,institute_id,class_id)
  select v_batch.id,v_batch.institute_id,class_id from unnest(v_class_ids) class_id;

  for v_group in select value from jsonb_array_elements(p_input->'schedules') loop
    for v_day in select jsonb_array_elements_text(v_group->'days') loop
      insert into public.class_schedules(institute_id,branch_id,academic_year_id,batch_id,subject_id,day_of_week,start_time,end_time,schedule_type,effective_from,is_active,created_by)
      values(v_profile.institute_id,v_batch.branch_id,v_batch.academic_year_id,v_batch.id,v_batch.subject_id,v_day::smallint,(v_group->>'startTime')::time,(v_group->>'endTime')::time,'regular_class',(p_input->>'effectiveFrom')::date,true,v_profile.id)
      returning id into v_schedule_id;
      v_created:=v_created||jsonb_build_array(v_schedule_id);
      if p_approve_overlap then
        for v_conflict in select cs.id schedule_id,cs.batch_id,cs.start_time,cs.end_time from public.class_schedules cs where cs.institute_id=v_profile.institute_id and cs.id<>v_schedule_id and cs.branch_id is not distinct from v_batch.branch_id and cs.day_of_week=v_day::smallint and cs.is_active is true and cs.start_time<(v_group->>'endTime')::time and cs.end_time>(v_group->>'startTime')::time loop
          insert into public.batch_schedule_overlap_approvals(institute_id,branch_id,proposed_batch_id,proposed_schedule_id,conflicting_batch_id,conflicting_schedule_id,day_of_week,existing_start_time,existing_end_time,proposed_start_time,proposed_end_time,reason,approved_by)
          values(v_profile.institute_id,v_batch.branch_id,v_batch.id,v_schedule_id,v_conflict.batch_id,v_conflict.schedule_id,v_day::smallint,v_conflict.start_time,v_conflict.end_time,(v_group->>'startTime')::time,(v_group->>'endTime')::time,nullif(upper(btrim(p_input->>'overlapReason')),''),v_profile.id);
        end loop;
      end if;
    end loop;
  end loop;
  return jsonb_build_object('status','success','batchId',v_batch.id,'scheduleIds',v_created,'conflicts',v_conflicts,'boardIds',to_jsonb(v_board_ids),'classIds',to_jsonb(v_class_ids));
end;
$function$;

create or replace function public.change_student_assignment(p_student_id uuid,p_academic_year_id uuid,p_school_id uuid,p_board_id uuid,p_class_id uuid,p_batch_id uuid,p_effective_from date,p_promotion_type text,p_remarks text)
returns jsonb language plpgsql security definer set search_path to '' as $function$
declare v_institute_id uuid; v_role text; v_current public.student_assignments%rowtype; v_new_id uuid; v_had_assignment boolean;
begin
  select p.institute_id,coalesce(nullif(btrim(p.role),''),r.name) into v_institute_id,v_role from public.profiles p left join public.roles r on r.id=p.role_id where p.id=auth.uid() and p.is_active is true;
  if v_institute_id is null or v_role not in ('admin','Super Admin','Institute Admin') then raise exception 'STUDENT_ASSIGNMENT_UNAUTHORIZED'; end if;
  if p_effective_from is null then raise exception 'STUDENT_ASSIGNMENT_EFFECTIVE_FROM_REQUIRED'; end if;
  if p_promotion_type not in ('New Admission','Promoted','Batch Transfer','School Transfer','Readmission') then raise exception 'STUDENT_ASSIGNMENT_PROMOTION_TYPE_INVALID'; end if;
  perform 1 from public.students s where s.id=p_student_id and s.institute_id=v_institute_id for update; if not found then raise exception 'STUDENT_ASSIGNMENT_STUDENT_INVALID'; end if;
  if not exists(select 1 from public.academic_years ay where ay.id=p_academic_year_id and ay.institute_id=v_institute_id and ay.is_active is true) then raise exception 'STUDENT_ASSIGNMENT_ACADEMIC_YEAR_INVALID'; end if;
  if not exists(select 1 from public.schools s where s.id=p_school_id and s.institute_id=v_institute_id and s.is_active is true) then raise exception 'STUDENT_ASSIGNMENT_SCHOOL_INVALID'; end if;
  if not exists(select 1 from public.boards b where b.id=p_board_id and b.institute_id=v_institute_id) then raise exception 'STUDENT_ASSIGNMENT_BOARD_INVALID'; end if;
  if not exists(select 1 from public.academic_classes c where c.id=p_class_id and c.institute_id=v_institute_id) then raise exception 'STUDENT_ASSIGNMENT_CLASS_INVALID'; end if;
  if not exists(select 1 from public.batches b where b.id=p_batch_id and b.institute_id=v_institute_id and b.is_active is true and exists(select 1 from public.batch_boards bb where bb.batch_id=b.id and bb.institute_id=b.institute_id and bb.board_id=p_board_id) and exists(select 1 from public.batch_classes bc where bc.batch_id=b.id and bc.institute_id=b.institute_id and bc.class_id=p_class_id)) then raise exception 'STUDENT_ASSIGNMENT_BATCH_INCOMPATIBLE'; end if;
  select * into v_current from public.student_assignments sa where sa.student_id=p_student_id and sa.institute_id=v_institute_id and sa.status='Current' and sa.effective_to is null for update;
  select exists(select 1 from public.student_assignments sa where sa.student_id=p_student_id and sa.institute_id=v_institute_id) into v_had_assignment;
  if v_current.id is not null then if p_effective_from<=v_current.effective_from then raise exception 'STUDENT_ASSIGNMENT_EFFECTIVE_FROM_NOT_LATER'; end if; update public.student_assignments set effective_to=p_effective_from-1,status='Completed',updated_at=now() where id=v_current.id; end if;
  insert into public.student_assignments(institute_id,student_id,academic_year_id,school_id,board_id,class_id,batch_id,effective_from,effective_to,status,promotion_type,remarks) values(v_institute_id,p_student_id,p_academic_year_id,p_school_id,p_board_id,p_class_id,p_batch_id,p_effective_from,null,'Current',p_promotion_type,nullif(btrim(p_remarks),'')) returning id into v_new_id;
  return jsonb_build_object('assignment_id',v_new_id,'previous_assignment_id',v_current.id,'operation',case when v_had_assignment then 'changed' else 'created' end);
exception when exclusion_violation then raise exception 'STUDENT_ASSIGNMENT_OVERLAP'; when unique_violation then raise exception 'STUDENT_ASSIGNMENT_CURRENT_CONFLICT'; end;
$function$;

create or replace function public.rollover_batch_is_valid(p_request_id uuid,p_batch_id uuid,p_require_availability boolean default false)
returns boolean language plpgsql stable set search_path to '' as $function$
declare v_request public.student_rollover_requests%rowtype; v_available integer; v_existing_count integer;
begin
  select * into v_request from public.student_rollover_requests where id=p_request_id; if v_request.id is null then return false; end if;
  select count(*) into v_existing_count from public.batches b where b.id=p_batch_id and b.institute_id=v_request.institute_id and b.academic_year_id=v_request.target_academic_year_id and b.is_active is true and exists(select 1 from public.batch_boards bb where bb.batch_id=b.id and bb.institute_id=b.institute_id and bb.board_id=v_request.proposed_board_id) and exists(select 1 from public.batch_classes bc where bc.batch_id=b.id and bc.institute_id=b.institute_id and bc.class_id=v_request.proposed_class_id);
  if v_existing_count=0 then return false; end if;
  if p_require_availability then select public.rollover_seat_availability(p_batch_id,v_request.target_academic_year_id,v_request.id) into v_available; if v_available is not null and v_available<1 then return false; end if; end if;
  return true;
end;
$function$;

create or replace function public.list_rollover_eligible_batches(p_request_id uuid)
returns jsonb language plpgsql security definer set search_path to '' as $function$
declare v_request public.student_rollover_requests%rowtype; v_profile public.profiles%rowtype; v_role text; v_results jsonb:='[]'::jsonb; v_row record; v_available integer;
begin
  select * into v_request from public.student_rollover_requests where id=p_request_id; if v_request.id is null then raise exception 'ROLLOVER_REQUEST_NOT_FOUND'; end if;
  select * into v_profile from public.profiles p where p.id=auth.uid() and p.is_active is true;
  select coalesce(nullif(btrim(p.role),''),r.name) into v_role from public.profiles p left join public.roles r on r.id=p.role_id where p.id=auth.uid();
  if v_profile.id is null then raise exception 'ROLLOVER_UNAUTHORIZED'; end if;
  if v_role in ('admin','Super Admin','Institute Admin') then if v_profile.institute_id<>v_request.institute_id then raise exception 'ROLLOVER_UNAUTHORIZED'; end if;
  elsif v_role='Parent' then if not exists(select 1 from public.parents pa join public.student_parent_links spl on spl.parent_id=pa.id and spl.institute_id=pa.institute_id where pa.profile_id=v_profile.id and pa.institute_id=v_request.institute_id and pa.is_active is true and spl.student_id=v_request.student_id) then raise exception 'ROLLOVER_UNAUTHORIZED'; end if; else raise exception 'ROLLOVER_UNAUTHORIZED'; end if;
  for v_row in select b.id,b.name,b.branch_id,b.subject_id,b.capacity,br.name as branch_name,s.subject_name,(select count(*) from public.student_assignments sa where sa.batch_id=b.id and sa.academic_year_id=v_request.target_academic_year_id and sa.status='Current') as assigned,(select count(*) from public.student_rollover_requests rr where rr.selected_batch_id=b.id and rr.target_academic_year_id=v_request.target_academic_year_id and rr.parent_locked_at is not null and rr.admin_status in ('ready','approved') and rr.id<>v_request.id) as reserved from public.batches b left join public.branches br on br.id=b.branch_id and br.institute_id=b.institute_id left join public.subjects s on s.id=b.subject_id and s.institute_id=b.institute_id where b.institute_id=v_request.institute_id and b.academic_year_id=v_request.target_academic_year_id and b.is_active is true and exists(select 1 from public.batch_boards bb where bb.batch_id=b.id and bb.institute_id=b.institute_id and bb.board_id=v_request.proposed_board_id) and exists(select 1 from public.batch_classes bc where bc.batch_id=b.id and bc.institute_id=b.institute_id and bc.class_id=v_request.proposed_class_id) order by b.name loop
    v_available:=case when v_row.capacity is null then null else v_row.capacity-v_row.assigned-v_row.reserved end;
    v_results:=v_results||jsonb_build_object('batch_id',v_row.id,'batch_name',v_row.name,'branch_name',v_row.branch_name,'subject_name',v_row.subject_name,'capacity',v_row.capacity,'assigned',v_row.assigned,'reserved',v_row.reserved,'available',v_available);
  end loop;
  return v_results;
end;
$function$;
