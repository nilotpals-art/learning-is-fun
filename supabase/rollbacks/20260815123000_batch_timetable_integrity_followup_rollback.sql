begin;

drop function if exists public.delete_teaching_batch(uuid);
drop trigger if exists class_schedules_prevent_internal_overlap on public.class_schedules;
drop function if exists public.prevent_batch_internal_schedule_overlap();

create or replace function public.schedule_pending_replacement(p_event_id uuid,p_new_date date,p_new_start_time time,p_new_end_time time,p_reason text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_profile public.profiles%rowtype;v_old public.schedule_events%rowtype;v_new public.schedule_events%rowtype;
begin
 select * into v_profile from public.profiles where id=(select auth.uid()) and is_active is true and role in ('Administrator','Super Admin','admin','Institute Admin');
 select * into v_old from public.schedule_events where id=p_event_id and institute_id=v_profile.institute_id for update;
 if v_old.id is null or v_old.status<>'cancelled' or v_old.reschedule_pending is not true then raise exception 'PLANNER_PENDING_EVENT_NOT_FOUND'; end if;
 if p_new_end_time<=p_new_start_time then raise exception 'PLANNER_EVENT_TIME_INVALID'; end if;
 perform pg_advisory_xact_lock(hashtextextended(v_old.institute_id::text||'|'||p_new_date::text||'|'||coalesce(v_old.batch_id::text,''),0));
 if exists(select 1 from public.schedule_events e where e.institute_id=v_old.institute_id and e.event_date=p_new_date and e.status not in('cancelled','rescheduled') and e.start_time<p_new_end_time and e.end_time>p_new_start_time and e.batch_id=v_old.batch_id) then raise exception 'PLANNER_EVENT_CONFLICT'; end if;
 insert into public.schedule_events(institute_id,branch_id,academic_year_id,batch_id,class_schedule_id,subject_id,event_date,start_time,end_time,schedule_type,status,title,description,original_event_id,reschedule_reason,notification_required,created_by) values(v_old.institute_id,v_old.branch_id,v_old.academic_year_id,v_old.batch_id,v_old.class_schedule_id,v_old.subject_id,p_new_date,p_new_start_time,p_new_end_time,v_old.schedule_type,'scheduled',v_old.title,v_old.description,v_old.id,upper(btrim(p_reason)),true,v_profile.id) returning * into v_new;
 update public.schedule_events set reschedule_pending=false,reschedule_pending_resolved_at=now(),reschedule_pending_resolved_by=v_profile.id where id=v_old.id;
 insert into public.schedule_changes(schedule_event_id,change_type,old_date,old_start_time,old_end_time,new_date,new_start_time,new_end_time,reason,changed_by) values(v_old.id,'rescheduled',v_old.event_date,v_old.start_time,v_old.end_time,p_new_date,p_new_start_time,p_new_end_time,upper(btrim(p_reason)),v_profile.id);
 insert into public.notifications(institute_id,schedule_event_id,notification_type,title,message,priority,created_by) values(v_new.institute_id,v_new.id,'rescheduled','Replacement Class Scheduled','The cancelled class has been rescheduled to '||to_char(p_new_date,'DD Mon YYYY')||' at '||to_char(p_new_start_time,'HH12:MI AM')||'.','important',v_profile.id);
 return to_jsonb(v_new);
end $$;

revoke all on function public.schedule_pending_replacement(uuid,date,time,time,text) from public,anon;
grant execute on function public.schedule_pending_replacement(uuid,date,time,time,text) to authenticated;

commit;
