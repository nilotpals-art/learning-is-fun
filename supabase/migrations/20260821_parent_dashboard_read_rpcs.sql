create or replace function public.list_parent_dashboard_children()
returns jsonb
language plpgsql security definer set search_path to '' as $function$
declare v_profile public.profiles%rowtype; v_results jsonb := '[]'::jsonb; v_row record;
begin
  select * into v_profile from public.profiles p where p.id=auth.uid() and p.is_active is true and p.role='Parent';
  if v_profile.id is null or v_profile.institute_id is null then raise exception 'PARENT_UNAUTHORIZED'; end if;
  for v_row in
    select s.id student_id,s.name student_name,s.admission_no,ay.name academic_year_name,c.class_name,b.name batch_name
    from public.parents pa
    join public.student_parent_links spl on spl.parent_id=pa.id and spl.institute_id=pa.institute_id
    join public.students s on s.id=spl.student_id and s.institute_id=spl.institute_id
    left join lateral (select sa.* from public.student_assignments sa where sa.student_id=s.id and sa.institute_id=s.institute_id and sa.status='Current' and sa.effective_to is null order by sa.effective_from desc limit 1) sa on true
    left join public.academic_years ay on ay.id=sa.academic_year_id and ay.institute_id=sa.institute_id
    left join public.academic_classes c on c.id=sa.class_id and c.institute_id=sa.institute_id
    left join public.batches b on b.id=sa.batch_id and b.institute_id=sa.institute_id
    where pa.profile_id=v_profile.id and pa.institute_id=v_profile.institute_id and pa.is_active is true and s.status='Active'
    order by s.name
  loop
    v_results:=v_results||jsonb_build_object('student_id',v_row.student_id,'student_name',v_row.student_name,'admission_no',v_row.admission_no,'academic_year_name',v_row.academic_year_name,'class_name',v_row.class_name,'batch_name',v_row.batch_name);
  end loop;
  return v_results;
end;$function$;

create or replace function public.list_parent_student_attendance(p_student_id uuid,p_months_back integer default 6)
returns jsonb language plpgsql stable security definer set search_path to '' as $function$
declare v_institute_id uuid; v_results jsonb;
begin
  select p.institute_id into v_institute_id from public.profiles p where p.id=auth.uid() and p.is_active is true and p.role='Parent';
  if v_institute_id is null or not public.fee_parent_can_view_student(v_institute_id,p_student_id) then raise exception 'PARENT_UNAUTHORIZED'; end if;
  select coalesce(jsonb_agg(jsonb_build_object('attendance_date',sa.attendance_date,'status',sa.status,'remarks',sa.remarks) order by sa.attendance_date desc),'[]'::jsonb) into v_results
  from public.student_attendance sa where sa.institute_id=v_institute_id and sa.student_id=p_student_id and sa.attendance_date >= (current_date - make_interval(months=>greatest(coalesce(p_months_back,6),1)));
  return v_results;
end;$function$;

create or replace function public.list_parent_student_schedule(p_student_id uuid,p_days_ahead integer default 14)
returns jsonb language plpgsql stable security definer set search_path to '' as $function$
declare v_institute_id uuid; v_results jsonb;
begin
  select p.institute_id into v_institute_id from public.profiles p where p.id=auth.uid() and p.is_active is true and p.role='Parent';
  if v_institute_id is null or not public.fee_parent_can_view_student(v_institute_id,p_student_id) then raise exception 'PARENT_UNAUTHORIZED'; end if;
  select coalesce(jsonb_agg(jsonb_build_object('id',e.id,'title',e.title,'event_date',e.event_date,'start_time',e.start_time,'end_time',e.end_time,'schedule_type',e.schedule_type,'status',e.status,'subject_name',sub.subject_name,'batch_name',b.name) order by e.event_date,e.start_time),'[]'::jsonb) into v_results
  from public.schedule_events e
  join public.student_assignments sa on sa.institute_id=e.institute_id and sa.student_id=p_student_id and sa.batch_id=e.batch_id and sa.effective_from<=e.event_date and (sa.effective_to is null or sa.effective_to>=e.event_date)
  left join public.subjects sub on sub.id=e.subject_id and sub.institute_id=e.institute_id
  left join public.batches b on b.id=e.batch_id and b.institute_id=e.institute_id
  where e.institute_id=v_institute_id and e.event_date between current_date and current_date+greatest(coalesce(p_days_ahead,14),1) and e.status in ('scheduled','completed');
  return v_results;
end;$function$;

revoke all on function public.list_parent_dashboard_children() from public;
revoke all on function public.list_parent_student_attendance(uuid,integer) from public;
revoke all on function public.list_parent_student_schedule(uuid,integer) from public;
grant execute on function public.list_parent_dashboard_children() to authenticated;
grant execute on function public.list_parent_student_attendance(uuid,integer) to authenticated;
grant execute on function public.list_parent_student_schedule(uuid,integer) to authenticated;
