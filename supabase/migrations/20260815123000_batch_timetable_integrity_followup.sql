BEGIN;

CREATE FUNCTION public.prevent_batch_internal_schedule_overlap()
RETURNS trigger LANGUAGE plpgsql SET search_path='' AS $$
BEGIN
 IF NEW.is_active IS TRUE AND EXISTS(
   SELECT 1 FROM public.class_schedules cs
   WHERE cs.institute_id=NEW.institute_id AND cs.batch_id=NEW.batch_id AND cs.day_of_week=NEW.day_of_week
     AND cs.id<>NEW.id AND cs.is_active IS TRUE
     AND daterange(cs.effective_from,COALESCE(cs.effective_to,'infinity'::date),'[]') && daterange(NEW.effective_from,COALESCE(NEW.effective_to,'infinity'::date),'[]')
     AND cs.start_time<NEW.end_time AND cs.end_time>NEW.start_time
 ) THEN RAISE EXCEPTION 'BATCH_INTERNAL_SCHEDULE_OVERLAP'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER class_schedules_prevent_internal_overlap BEFORE INSERT OR UPDATE ON public.class_schedules FOR EACH ROW EXECUTE FUNCTION public.prevent_batch_internal_schedule_overlap();

CREATE FUNCTION public.delete_teaching_batch(p_batch_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_profile public.profiles%ROWTYPE;
BEGIN
 SELECT * INTO v_profile FROM public.profiles WHERE id=(SELECT auth.uid()) AND is_active IS TRUE AND role IN ('Administrator','Super Admin','admin','Institute Admin');
 IF v_profile.id IS NULL THEN RAISE EXCEPTION 'BATCH_UNAUTHORIZED'; END IF;
 DELETE FROM public.batches WHERE id=p_batch_id AND institute_id=v_profile.institute_id;
 RETURN FOUND;
END $$;

CREATE OR REPLACE FUNCTION public.schedule_pending_replacement(p_event_id uuid,p_new_date date,p_new_start_time time,p_new_end_time time,p_reason text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_profile public.profiles%ROWTYPE;v_old public.schedule_events%ROWTYPE;v_new public.schedule_events%ROWTYPE;v_notification_id uuid;
BEGIN
 SELECT * INTO v_profile FROM public.profiles WHERE id=(SELECT auth.uid()) AND is_active IS TRUE AND role IN ('Administrator','Super Admin','admin','Institute Admin');
 SELECT * INTO v_old FROM public.schedule_events WHERE id=p_event_id AND institute_id=v_profile.institute_id FOR UPDATE;
 IF v_old.id IS NULL OR v_old.status<>'cancelled' OR v_old.reschedule_pending IS NOT TRUE THEN RAISE EXCEPTION 'PLANNER_PENDING_EVENT_NOT_FOUND'; END IF;
 IF p_new_end_time<=p_new_start_time THEN RAISE EXCEPTION 'PLANNER_EVENT_TIME_INVALID'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(v_old.institute_id::text||'|'||p_new_date::text||'|'||COALESCE(v_old.batch_id::text,''),0));
 IF EXISTS(SELECT 1 FROM public.schedule_events e WHERE e.institute_id=v_old.institute_id AND e.event_date=p_new_date AND e.status NOT IN('cancelled','rescheduled') AND e.start_time<p_new_end_time AND e.end_time>p_new_start_time AND e.batch_id=v_old.batch_id) THEN RAISE EXCEPTION 'PLANNER_EVENT_CONFLICT'; END IF;
 INSERT INTO public.schedule_events(institute_id,branch_id,academic_year_id,batch_id,class_schedule_id,subject_id,event_date,start_time,end_time,schedule_type,status,title,description,original_event_id,reschedule_reason,notification_required,created_by) VALUES(v_old.institute_id,v_old.branch_id,v_old.academic_year_id,v_old.batch_id,v_old.class_schedule_id,v_old.subject_id,p_new_date,p_new_start_time,p_new_end_time,v_old.schedule_type,'scheduled',v_old.title,v_old.description,v_old.id,upper(btrim(p_reason)),true,v_profile.id) RETURNING * INTO v_new;
 UPDATE public.schedule_events SET reschedule_pending=false,reschedule_pending_resolved_at=now(),reschedule_pending_resolved_by=v_profile.id WHERE id=v_old.id;
 INSERT INTO public.schedule_changes(schedule_event_id,change_type,old_date,old_start_time,old_end_time,new_date,new_start_time,new_end_time,reason,changed_by) VALUES(v_old.id,'rescheduled',v_old.event_date,v_old.start_time,v_old.end_time,p_new_date,p_new_start_time,p_new_end_time,upper(btrim(p_reason)),v_profile.id);
 INSERT INTO public.notifications(institute_id,schedule_event_id,notification_type,title,message,priority,created_by) VALUES(v_new.institute_id,v_new.id,'rescheduled','Replacement Class Scheduled','The cancelled class has been rescheduled to '||to_char(p_new_date,'DD Mon YYYY')||' at '||to_char(p_new_start_time,'HH12:MI AM')||'.','important',v_profile.id) RETURNING id INTO v_notification_id;
 INSERT INTO public.notification_recipients(institute_id,notification_id,user_id,recipient_role,delivery_channel)
 SELECT v_new.institute_id,v_notification_id,r.user_id,r.recipient_role,c.channel FROM (
  SELECT DISTINCT s.profile_id user_id,'Student'::text recipient_role FROM public.student_assignments sa JOIN public.students s ON s.id=sa.student_id AND s.institute_id=sa.institute_id JOIN public.profiles p ON p.id=s.profile_id AND p.is_active IS TRUE WHERE sa.institute_id=v_new.institute_id AND sa.batch_id=v_new.batch_id AND sa.effective_from<=v_new.event_date AND (sa.effective_to IS NULL OR sa.effective_to>=v_new.event_date) AND s.profile_id IS NOT NULL
  UNION SELECT DISTINCT pa.profile_id,'Parent' FROM public.student_assignments sa JOIN public.student_parent_links spl ON spl.student_id=sa.student_id AND spl.institute_id=sa.institute_id JOIN public.parents pa ON pa.id=spl.parent_id AND pa.institute_id=spl.institute_id AND pa.is_active IS TRUE JOIN public.profiles p ON p.id=pa.profile_id AND p.is_active IS TRUE WHERE sa.institute_id=v_new.institute_id AND sa.batch_id=v_new.batch_id AND sa.effective_from<=v_new.event_date AND (sa.effective_to IS NULL OR sa.effective_to>=v_new.event_date) AND pa.profile_id IS NOT NULL
 )r CROSS JOIN(VALUES('in_app'),('email'))c(channel) ON CONFLICT DO NOTHING;
 RETURN to_jsonb(v_new);
END $$;

REVOKE ALL ON FUNCTION public.prevent_batch_internal_schedule_overlap(),public.delete_teaching_batch(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.delete_teaching_batch(uuid) TO authenticated;
COMMIT;
