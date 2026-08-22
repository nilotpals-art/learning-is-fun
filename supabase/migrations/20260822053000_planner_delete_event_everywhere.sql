create or replace function public.delete_planner_event_everywhere_internal(p_event_id uuid, p_allow_past boolean)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_profile public.profiles%rowtype;
  v_role text;
  v_event public.schedule_events%rowtype;
  v_root_id uuid;
  v_ids uuid[];
  v_notification_ids uuid[];
begin
  select p.* into v_profile from public.profiles p where p.id=auth.uid() and p.is_active is true;
  if v_profile.id is null or v_profile.institute_id is null then raise exception 'PLANNER_DELETE_UNAUTHORIZED'; end if;
  select coalesce(nullif(btrim(v_profile.role),''),r.name) into v_role from public.roles r where r.id=v_profile.role_id;
  if v_role is null then v_role:=nullif(btrim(v_profile.role),''); end if;
  if v_role not in ('admin','Super Admin','Institute Admin') then raise exception 'PLANNER_DELETE_UNAUTHORIZED'; end if;

  select * into v_event from public.schedule_events where id=p_event_id and institute_id=v_profile.institute_id for update;
  if v_event.id is null then raise exception 'PLANNER_EVENT_NOT_FOUND'; end if;
  if not p_allow_past and v_event.event_date < current_date then raise exception 'PLANNER_EVENT_PAST'; end if;

  v_root_id:=coalesce(v_event.original_event_id,v_event.id);
  select array_agg(id order by case when id=v_root_id then 1 else 0 end) into v_ids
  from public.schedule_events
  where institute_id=v_profile.institute_id and (id=v_root_id or original_event_id=v_root_id);

  if exists(select 1 from public.exam_result_sets where schedule_event_id=any(v_ids)) then
    raise exception 'PLANNER_EVENT_HAS_EXAM_RESULTS';
  end if;

  update public.practice_assignments set schedule_event_id=null where schedule_event_id=any(v_ids);
  update public.practice_sets set schedule_event_id=null where schedule_event_id=any(v_ids);

  update public.schedule_events set related_event_id=null
  where institute_id=v_profile.institute_id and related_event_id=any(v_ids) and not(id=any(v_ids));

  select array_agg(id) into v_notification_ids
  from public.notifications where institute_id=v_profile.institute_id and schedule_event_id=any(v_ids);

  if coalesce(cardinality(v_notification_ids),0)>0 then
    delete from public.admin_notification_whatsapp_outbox where institute_id=v_profile.institute_id and notification_id=any(v_notification_ids);
    delete from public.admin_notification_campaigns where institute_id=v_profile.institute_id and notification_id=any(v_notification_ids);
    delete from public.notification_recipients where institute_id=v_profile.institute_id and notification_id=any(v_notification_ids);
    delete from public.notifications where institute_id=v_profile.institute_id and id=any(v_notification_ids);
  end if;

  delete from public.planner_message_outbox where institute_id=v_profile.institute_id and schedule_event_id=any(v_ids);
  delete from public.planner_event_overlap_approvals where event_id=any(v_ids) or source_event_id=any(v_ids) or conflicting_event_id=any(v_ids);
  delete from public.schedule_changes where schedule_event_id=any(v_ids);
  delete from public.schedule_events where institute_id=v_profile.institute_id and id=any(v_ids);

  return jsonb_build_object(
    'deleted',coalesce(cardinality(v_ids),0),
    'restoredRecurringClass',v_event.class_schedule_id is not null
  );
end;
$function$;
revoke all on function public.delete_planner_event_everywhere_internal(uuid,boolean) from public,anon,authenticated;

create or replace function public.delete_forthcoming_planner_event(p_event_id uuid)
returns jsonb
language sql
security definer
set search_path to ''
as $function$
  select public.delete_planner_event_everywhere_internal(p_event_id,false);
$function$;
revoke all on function public.delete_forthcoming_planner_event(uuid) from public,anon;
grant execute on function public.delete_forthcoming_planner_event(uuid) to authenticated;

create or replace function public.delete_planner_event_from_history(p_event_id uuid)
returns jsonb
language sql
security definer
set search_path to ''
as $function$
  select public.delete_planner_event_everywhere_internal(p_event_id,true);
$function$;
revoke all on function public.delete_planner_event_from_history(uuid) from public,anon;
grant execute on function public.delete_planner_event_from_history(uuid) to authenticated;

drop function if exists public.delete_planner_history_entry(uuid);
