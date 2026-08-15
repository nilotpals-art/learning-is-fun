begin;

create or replace function public.create_planner_event(p_input jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_profile public.profiles%rowtype; v_batch public.batches%rowtype; v_subject uuid; v_year uuid; v_payload jsonb; v_result jsonb; v_event_id uuid;
begin
 select * into v_profile from public.profiles where id=(select auth.uid()) and is_active is true and role in ('Administrator','Super Admin','admin','Institute Admin');
 if v_profile.id is null then raise exception 'PLANNER_UNAUTHORIZED'; end if;
 if nullif(p_input->>'batchId','') is not null then select * into v_batch from public.batches where id=(p_input->>'batchId')::uuid and institute_id=v_profile.institute_id and is_active is true; if v_batch.id is null then raise exception 'PLANNER_BATCH_INVALID'; end if; end if;
 if p_input->>'scheduleType'='regular_class' then if v_batch.id is null or v_batch.subject_id is null or v_batch.academic_year_id is null then raise exception 'PLANNER_BATCH_CONTEXT_INVALID'; end if; v_subject:=v_batch.subject_id;v_year:=v_batch.academic_year_id;
 elsif p_input->>'scheduleType' in ('parent_meeting','holiday') then v_subject:=null;v_year:=coalesce(nullif(p_input->>'academicYearId','')::uuid,v_batch.academic_year_id);
 else v_subject:=nullif(p_input->>'subjectId','')::uuid;v_year:=coalesce(nullif(p_input->>'academicYearId','')::uuid,v_batch.academic_year_id); end if;
 if v_year is null or not exists(select 1 from public.academic_years where id=v_year and institute_id=v_profile.institute_id) then raise exception 'PLANNER_ACADEMIC_YEAR_INVALID'; end if;
 if v_subject is not null and not exists(select 1 from public.subjects where id=v_subject and institute_id=v_profile.institute_id) then raise exception 'PLANNER_SUBJECT_INVALID'; end if;
 if nullif(p_input->>'relatedEventId','') is not null and not exists(select 1 from public.schedule_events where id=(p_input->>'relatedEventId')::uuid and institute_id=v_profile.institute_id) then raise exception 'PLANNER_RELATED_EVENT_INVALID'; end if;
 v_payload:=p_input||jsonb_build_object('academicYearId',v_year,'subjectId',v_subject,'branchId',coalesce(nullif(p_input->>'branchId',''),v_batch.branch_id::text,''));
 v_result:=public.create_schedule_event(v_payload);v_event_id:=(v_result->>'id')::uuid;
 if v_event_id is null then v_event_id:=(v_result->>'event_id')::uuid; end if;
 if nullif(p_input->>'relatedEventId','') is not null then update public.schedule_events set related_event_id=(p_input->>'relatedEventId')::uuid where id=v_event_id; end if;
 return (select to_jsonb(e) from public.schedule_events e where e.id=v_event_id);
end $$;

revoke all on function public.create_planner_event(jsonb) from public,anon;
grant execute on function public.create_planner_event(jsonb) to authenticated;

commit;
