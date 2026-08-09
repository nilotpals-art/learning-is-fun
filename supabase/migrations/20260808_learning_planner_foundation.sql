BEGIN;

ALTER TABLE public.branches
  ADD CONSTRAINT branches_id_institute_id_key UNIQUE (id, institute_id);
ALTER TABLE public.batches
  ADD CONSTRAINT batches_id_institute_id_key UNIQUE (id, institute_id);
ALTER TABLE public.subjects
  ADD CONSTRAINT subjects_id_institute_id_key UNIQUE (id, institute_id);

CREATE TABLE public.class_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institute_id uuid NOT NULL,
  branch_id uuid,
  academic_year_id uuid NOT NULL,
  batch_id uuid NOT NULL,
  subject_id uuid,
  day_of_week smallint NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  schedule_type text NOT NULL,
  room text,
  effective_from date NOT NULL,
  effective_to date,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT class_schedules_id_institute_id_key UNIQUE (id, institute_id),
  CONSTRAINT class_schedules_day_check CHECK (day_of_week BETWEEN 1 AND 7),
  CONSTRAINT class_schedules_time_check CHECK (end_time > start_time),
  CONSTRAINT class_schedules_dates_check CHECK (effective_to IS NULL OR effective_to >= effective_from),
  CONSTRAINT class_schedules_type_check CHECK (schedule_type IN (
    'regular_class','practice_work','practice_test','mock_test','exam','parent_meeting','holiday','special_class'
  )),
  CONSTRAINT class_schedules_institute_fkey FOREIGN KEY (institute_id)
    REFERENCES public.institutes(id) ON DELETE RESTRICT,
  CONSTRAINT class_schedules_branch_fkey FOREIGN KEY (branch_id, institute_id)
    REFERENCES public.branches(id, institute_id) ON DELETE RESTRICT,
  CONSTRAINT class_schedules_academic_year_fkey FOREIGN KEY (academic_year_id, institute_id)
    REFERENCES public.academic_years(id, institute_id) ON DELETE RESTRICT,
  CONSTRAINT class_schedules_batch_fkey FOREIGN KEY (batch_id, institute_id)
    REFERENCES public.batches(id, institute_id) ON DELETE RESTRICT,
  CONSTRAINT class_schedules_subject_fkey FOREIGN KEY (subject_id, institute_id)
    REFERENCES public.subjects(id, institute_id) ON DELETE RESTRICT,
  CONSTRAINT class_schedules_created_by_fkey FOREIGN KEY (created_by, institute_id)
    REFERENCES public.profiles(id, institute_id) ON DELETE RESTRICT
);

CREATE TABLE public.schedule_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institute_id uuid NOT NULL,
  branch_id uuid,
  academic_year_id uuid NOT NULL,
  batch_id uuid,
  class_schedule_id uuid,
  subject_id uuid,
  event_date date NOT NULL,
  start_time time,
  end_time time,
  schedule_type text NOT NULL,
  status text NOT NULL DEFAULT 'scheduled',
  title text NOT NULL,
  description text,
  room text,
  exam_id uuid,
  original_event_id uuid,
  reschedule_reason text,
  cancellation_reason text,
  notification_required boolean NOT NULL DEFAULT true,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT schedule_events_id_institute_id_key UNIQUE (id, institute_id),
  CONSTRAINT schedule_events_type_check CHECK (schedule_type IN (
    'regular_class','practice_work','practice_test','mock_test','exam','parent_meeting','holiday','special_class'
  )),
  CONSTRAINT schedule_events_status_check CHECK (status IN ('scheduled','rescheduled','cancelled','completed')),
  CONSTRAINT schedule_events_title_check CHECK (btrim(title) <> '' AND char_length(title) <= 150),
  CONSTRAINT schedule_events_description_check CHECK (description IS NULL OR char_length(description) <= 1000),
  CONSTRAINT schedule_events_room_check CHECK (room IS NULL OR char_length(room) <= 100),
  CONSTRAINT schedule_events_time_pair_check CHECK (
    (start_time IS NULL AND end_time IS NULL) OR (start_time IS NOT NULL AND end_time IS NOT NULL)
  ),
  CONSTRAINT schedule_events_time_order_check CHECK (
    start_time IS NULL OR end_time > start_time
  ),
  CONSTRAINT schedule_events_required_time_check CHECK (
    schedule_type = 'holiday' OR (start_time IS NOT NULL AND end_time IS NOT NULL)
  ),
  CONSTRAINT schedule_events_batch_check CHECK (schedule_type = 'holiday' OR batch_id IS NOT NULL),
  CONSTRAINT schedule_events_institute_fkey FOREIGN KEY (institute_id)
    REFERENCES public.institutes(id) ON DELETE RESTRICT,
  CONSTRAINT schedule_events_branch_fkey FOREIGN KEY (branch_id, institute_id)
    REFERENCES public.branches(id, institute_id) ON DELETE RESTRICT,
  CONSTRAINT schedule_events_academic_year_fkey FOREIGN KEY (academic_year_id, institute_id)
    REFERENCES public.academic_years(id, institute_id) ON DELETE RESTRICT,
  CONSTRAINT schedule_events_batch_fkey FOREIGN KEY (batch_id, institute_id)
    REFERENCES public.batches(id, institute_id) ON DELETE RESTRICT,
  CONSTRAINT schedule_events_class_schedule_fkey FOREIGN KEY (class_schedule_id, institute_id)
    REFERENCES public.class_schedules(id, institute_id) ON DELETE RESTRICT,
  CONSTRAINT schedule_events_subject_fkey FOREIGN KEY (subject_id, institute_id)
    REFERENCES public.subjects(id, institute_id) ON DELETE RESTRICT,
  CONSTRAINT schedule_events_original_fkey FOREIGN KEY (original_event_id, institute_id)
    REFERENCES public.schedule_events(id, institute_id) ON DELETE RESTRICT,
  CONSTRAINT schedule_events_created_by_fkey FOREIGN KEY (created_by, institute_id)
    REFERENCES public.profiles(id, institute_id) ON DELETE RESTRICT
);

CREATE TABLE public.schedule_changes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_event_id uuid NOT NULL,
  change_type text NOT NULL,
  old_date date,
  old_start_time time,
  old_end_time time,
  new_date date,
  new_start_time time,
  new_end_time time,
  reason text,
  changed_by uuid NOT NULL,
  changed_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT schedule_changes_type_check CHECK (change_type IN ('created','rescheduled','cancelled','restored','completed')),
  CONSTRAINT schedule_changes_event_fkey FOREIGN KEY (schedule_event_id)
    REFERENCES public.schedule_events(id) ON DELETE RESTRICT,
  CONSTRAINT schedule_changes_changed_by_fkey FOREIGN KEY (changed_by)
    REFERENCES public.profiles(id) ON DELETE RESTRICT
);

CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institute_id uuid NOT NULL,
  schedule_event_id uuid,
  notification_type text NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  priority text NOT NULL DEFAULT 'normal',
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT notifications_id_institute_id_key UNIQUE (id, institute_id),
  CONSTRAINT notifications_priority_check CHECK (priority IN ('normal','important','urgent')),
  CONSTRAINT notifications_institute_fkey FOREIGN KEY (institute_id)
    REFERENCES public.institutes(id) ON DELETE RESTRICT,
  CONSTRAINT notifications_event_fkey FOREIGN KEY (schedule_event_id, institute_id)
    REFERENCES public.schedule_events(id, institute_id) ON DELETE RESTRICT,
  CONSTRAINT notifications_created_by_fkey FOREIGN KEY (created_by, institute_id)
    REFERENCES public.profiles(id, institute_id) ON DELETE RESTRICT
);

CREATE TABLE public.notification_recipients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institute_id uuid NOT NULL,
  notification_id uuid NOT NULL,
  user_id uuid NOT NULL,
  recipient_role text NOT NULL,
  delivery_channel text NOT NULL DEFAULT 'in_app',
  delivery_status text NOT NULL DEFAULT 'pending',
  read_at timestamptz,
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT notification_recipients_channel_check CHECK (delivery_channel IN ('in_app','email')),
  CONSTRAINT notification_recipients_status_check CHECK (delivery_status IN ('pending','sent','failed')),
  CONSTRAINT notification_recipients_unique UNIQUE (notification_id, user_id, delivery_channel),
  CONSTRAINT notification_recipients_notification_fkey FOREIGN KEY (notification_id, institute_id)
    REFERENCES public.notifications(id, institute_id) ON DELETE RESTRICT,
  CONSTRAINT notification_recipients_user_fkey FOREIGN KEY (user_id, institute_id)
    REFERENCES public.profiles(id, institute_id) ON DELETE RESTRICT
);

CREATE INDEX class_schedules_institute_idx ON public.class_schedules(institute_id);
CREATE INDEX class_schedules_academic_year_idx ON public.class_schedules(academic_year_id);
CREATE INDEX class_schedules_batch_idx ON public.class_schedules(batch_id);
CREATE INDEX class_schedules_active_idx ON public.class_schedules(is_active);
CREATE INDEX class_schedules_scope_idx ON public.class_schedules(institute_id, branch_id, effective_from, effective_to);
CREATE INDEX schedule_events_institute_idx ON public.schedule_events(institute_id);
CREATE INDEX schedule_events_branch_idx ON public.schedule_events(branch_id);
CREATE INDEX schedule_events_academic_year_idx ON public.schedule_events(academic_year_id);
CREATE INDEX schedule_events_batch_idx ON public.schedule_events(batch_id);
CREATE INDEX schedule_events_date_idx ON public.schedule_events(event_date);
CREATE INDEX schedule_events_status_idx ON public.schedule_events(status);
CREATE INDEX schedule_events_type_idx ON public.schedule_events(schedule_type);
CREATE INDEX schedule_events_calendar_idx ON public.schedule_events(institute_id, event_date, start_time);
CREATE INDEX schedule_events_batch_conflict_idx ON public.schedule_events(institute_id, event_date, batch_id, start_time, end_time)
  WHERE status NOT IN ('cancelled','rescheduled');
CREATE INDEX schedule_events_room_conflict_idx ON public.schedule_events(institute_id, event_date, upper(btrim(room)), start_time, end_time)
  WHERE room IS NOT NULL AND status NOT IN ('cancelled','rescheduled');
CREATE INDEX schedule_changes_event_idx ON public.schedule_changes(schedule_event_id);
CREATE INDEX schedule_changes_recent_idx ON public.schedule_changes(changed_at DESC);
CREATE INDEX notifications_institute_idx ON public.notifications(institute_id);
CREATE INDEX notifications_event_idx ON public.notifications(schedule_event_id);
CREATE INDEX notification_recipients_user_idx ON public.notification_recipients(user_id);
CREATE INDEX notification_recipients_institute_idx ON public.notification_recipients(institute_id);
CREATE INDEX notification_recipients_notification_idx ON public.notification_recipients(notification_id);
CREATE INDEX notification_recipients_read_idx ON public.notification_recipients(read_at);
CREATE INDEX notification_recipients_user_unread_idx ON public.notification_recipients(user_id, created_at DESC) WHERE read_at IS NULL;

CREATE FUNCTION public.learning_planner_set_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;
CREATE TRIGGER class_schedules_updated_at BEFORE UPDATE ON public.class_schedules
FOR EACH ROW EXECUTE FUNCTION public.learning_planner_set_updated_at();
CREATE TRIGGER schedule_events_updated_at BEFORE UPDATE ON public.schedule_events
FOR EACH ROW EXECUTE FUNCTION public.learning_planner_set_updated_at();

CREATE FUNCTION public.learning_planner_admin_scope(p_institute_id uuid, p_branch_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY INVOKER SET search_path = '' AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p LEFT JOIN public.roles r ON r.id = p.role_id
    WHERE p.id = (SELECT auth.uid()) AND p.is_active IS TRUE
      AND p.institute_id = p_institute_id
      AND COALESCE(NULLIF(btrim(p.role), ''), r.name) IN ('admin','Super Admin','Institute Admin')
      AND (p.branch_id IS NULL OR p_branch_id IS NULL OR p.branch_id = p_branch_id)
  );
$$;

ALTER TABLE public.class_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedule_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedule_changes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_recipients ENABLE ROW LEVEL SECURITY;

CREATE POLICY class_schedules_admin_select ON public.class_schedules FOR SELECT TO authenticated
USING (public.learning_planner_admin_scope(institute_id, branch_id));
CREATE POLICY class_schedules_admin_insert ON public.class_schedules FOR INSERT TO authenticated
WITH CHECK (created_by = (SELECT auth.uid()) AND public.learning_planner_admin_scope(institute_id, branch_id));
CREATE POLICY class_schedules_admin_update ON public.class_schedules FOR UPDATE TO authenticated
USING (public.learning_planner_admin_scope(institute_id, branch_id))
WITH CHECK (public.learning_planner_admin_scope(institute_id, branch_id));

CREATE POLICY schedule_events_admin_select ON public.schedule_events FOR SELECT TO authenticated
USING (public.learning_planner_admin_scope(institute_id, branch_id));
CREATE POLICY schedule_events_student_select ON public.schedule_events FOR SELECT TO authenticated
USING (batch_id IS NOT NULL AND EXISTS (
  SELECT 1 FROM public.students s JOIN public.student_assignments sa
    ON sa.student_id=s.id AND sa.institute_id=s.institute_id
  WHERE s.profile_id=(SELECT auth.uid()) AND s.institute_id=schedule_events.institute_id
    AND sa.batch_id=schedule_events.batch_id AND sa.effective_from<=schedule_events.event_date
    AND (sa.effective_to IS NULL OR sa.effective_to>=schedule_events.event_date)
));
CREATE POLICY schedule_events_parent_select ON public.schedule_events FOR SELECT TO authenticated
USING (batch_id IS NOT NULL AND EXISTS (
  SELECT 1 FROM public.parents pa JOIN public.student_parent_links spl
    ON spl.parent_id=pa.id AND spl.institute_id=pa.institute_id
  JOIN public.student_assignments sa ON sa.student_id=spl.student_id AND sa.institute_id=spl.institute_id
  WHERE pa.profile_id=(SELECT auth.uid()) AND pa.is_active IS TRUE
    AND pa.institute_id=schedule_events.institute_id AND sa.batch_id=schedule_events.batch_id
    AND sa.effective_from<=schedule_events.event_date
    AND (sa.effective_to IS NULL OR sa.effective_to>=schedule_events.event_date)
));
CREATE POLICY schedule_events_admin_insert ON public.schedule_events FOR INSERT TO authenticated
WITH CHECK (created_by=(SELECT auth.uid()) AND public.learning_planner_admin_scope(institute_id, branch_id));
CREATE POLICY schedule_events_admin_update ON public.schedule_events FOR UPDATE TO authenticated
USING (public.learning_planner_admin_scope(institute_id, branch_id))
WITH CHECK (public.learning_planner_admin_scope(institute_id, branch_id));

CREATE POLICY schedule_changes_select ON public.schedule_changes FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.schedule_events e WHERE e.id=schedule_event_id));
CREATE POLICY schedule_changes_admin_insert ON public.schedule_changes FOR INSERT TO authenticated
WITH CHECK (changed_by=(SELECT auth.uid()) AND EXISTS (
  SELECT 1 FROM public.schedule_events e WHERE e.id=schedule_event_id
    AND public.learning_planner_admin_scope(e.institute_id,e.branch_id)
));

CREATE POLICY notifications_admin_select ON public.notifications FOR SELECT TO authenticated
USING (public.learning_planner_admin_scope(institute_id, NULL));
CREATE POLICY notifications_recipient_select ON public.notifications FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.notification_recipients nr
  WHERE nr.notification_id=id AND nr.user_id=(SELECT auth.uid())));
CREATE POLICY notifications_admin_insert ON public.notifications FOR INSERT TO authenticated
WITH CHECK (created_by=(SELECT auth.uid()) AND public.learning_planner_admin_scope(institute_id,NULL));

CREATE POLICY notification_recipients_admin_select ON public.notification_recipients FOR SELECT TO authenticated
USING (public.learning_planner_admin_scope(institute_id,NULL));
CREATE POLICY notification_recipients_self_select ON public.notification_recipients FOR SELECT TO authenticated
USING (user_id=(SELECT auth.uid()));
CREATE POLICY notification_recipients_admin_insert ON public.notification_recipients FOR INSERT TO authenticated
WITH CHECK (public.learning_planner_admin_scope(institute_id,NULL));
CREATE POLICY notification_recipients_self_update ON public.notification_recipients FOR UPDATE TO authenticated
USING (user_id=(SELECT auth.uid())) WITH CHECK (user_id=(SELECT auth.uid()));

REVOKE ALL ON public.class_schedules, public.schedule_events, public.schedule_changes,
  public.notifications, public.notification_recipients FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.class_schedules TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.schedule_events TO authenticated;
GRANT SELECT, INSERT ON public.schedule_changes TO authenticated;
GRANT SELECT, INSERT ON public.notifications TO authenticated;
GRANT SELECT, INSERT ON public.notification_recipients TO authenticated;
GRANT UPDATE(read_at) ON public.notification_recipients TO authenticated;

CREATE FUNCTION public.create_schedule_event(p_input jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE
  v_profile public.profiles%ROWTYPE; v_event public.schedule_events%ROWTYPE;
  v_notification_id uuid; v_title text; v_message text;
BEGIN
  SELECT * INTO v_profile FROM public.profiles WHERE id=auth.uid() AND is_active IS TRUE;
  IF v_profile.id IS NULL OR NOT public.learning_planner_admin_scope(v_profile.institute_id,(p_input->>'branchId')::uuid) THEN RAISE EXCEPTION 'PLANNER_UNAUTHORIZED'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(v_profile.institute_id::text||'|'||(p_input->>'eventDate')||'|'||COALESCE(p_input->>'batchId',''),0));
  IF NULLIF(btrim(p_input->>'room'),'') IS NOT NULL THEN
    PERFORM pg_advisory_xact_lock(hashtextextended(v_profile.institute_id::text||'|'||(p_input->>'eventDate')||'|'||upper(btrim(p_input->>'room')),0));
  END IF;
  IF EXISTS (SELECT 1 FROM public.schedule_events e WHERE e.institute_id=v_profile.institute_id
    AND e.event_date=(p_input->>'eventDate')::date AND e.status NOT IN ('cancelled','rescheduled')
    AND e.start_time IS NOT NULL AND e.end_time IS NOT NULL
    AND e.start_time<(p_input->>'endTime')::time AND e.end_time>(p_input->>'startTime')::time
    AND ((NULLIF(p_input->>'batchId','') IS NOT NULL AND e.batch_id=(p_input->>'batchId')::uuid)
      OR (NULLIF(btrim(p_input->>'room'),'') IS NOT NULL AND upper(btrim(e.room))=upper(btrim(p_input->>'room')))))
  THEN RAISE EXCEPTION 'PLANNER_EVENT_CONFLICT'; END IF;
  INSERT INTO public.schedule_events(institute_id,branch_id,academic_year_id,batch_id,class_schedule_id,subject_id,event_date,start_time,end_time,schedule_type,status,title,description,room,notification_required,created_by)
  VALUES(v_profile.institute_id,NULLIF(p_input->>'branchId','')::uuid,(p_input->>'academicYearId')::uuid,NULLIF(p_input->>'batchId','')::uuid,NULLIF(p_input->>'classScheduleId','')::uuid,NULLIF(p_input->>'subjectId','')::uuid,(p_input->>'eventDate')::date,NULLIF(p_input->>'startTime','')::time,NULLIF(p_input->>'endTime','')::time,p_input->>'scheduleType','scheduled',upper(btrim(p_input->>'title')),NULLIF(upper(btrim(p_input->>'description')),''),NULLIF(upper(btrim(p_input->>'room')),''),COALESCE((p_input->>'notificationRequired')::boolean,true),v_profile.id)
  RETURNING * INTO v_event;
  INSERT INTO public.schedule_changes(schedule_event_id,change_type,new_date,new_start_time,new_end_time,changed_by)
  VALUES(v_event.id,'created',v_event.event_date,v_event.start_time,v_event.end_time,v_profile.id);
  IF v_event.notification_required THEN
    v_title := CASE v_event.schedule_type WHEN 'practice_test' THEN 'Practice Test Scheduled' WHEN 'mock_test' THEN 'Mock Test Scheduled' WHEN 'exam' THEN 'Exam Scheduled' WHEN 'parent_meeting' THEN 'Parent Meeting Scheduled' ELSE 'Class Scheduled' END;
    v_message := v_event.title||' is scheduled for '||to_char(v_event.event_date,'DD Mon YYYY')||CASE WHEN v_event.start_time IS NULL THEN '.' ELSE ' from '||to_char(v_event.start_time,'HH12:MI AM')||' to '||to_char(v_event.end_time,'HH12:MI AM')||'.' END;
    INSERT INTO public.notifications(institute_id,schedule_event_id,notification_type,title,message,priority,created_by)
    VALUES(v_profile.institute_id,v_event.id,'scheduled',v_title,v_message,'normal',v_profile.id) RETURNING id INTO v_notification_id;
    INSERT INTO public.notification_recipients(institute_id,notification_id,user_id,recipient_role,delivery_channel)
    SELECT v_profile.institute_id,v_notification_id,r.user_id,r.recipient_role,c.channel FROM (
      SELECT DISTINCT s.profile_id user_id,'Student'::text recipient_role FROM public.student_assignments sa JOIN public.students s ON s.id=sa.student_id AND s.institute_id=sa.institute_id JOIN public.profiles p ON p.id=s.profile_id AND p.is_active IS TRUE WHERE sa.institute_id=v_profile.institute_id AND sa.batch_id=v_event.batch_id AND sa.effective_from<=v_event.event_date AND (sa.effective_to IS NULL OR sa.effective_to>=v_event.event_date) AND s.profile_id IS NOT NULL
      UNION SELECT DISTINCT pa.profile_id,'Parent' FROM public.student_assignments sa JOIN public.student_parent_links spl ON spl.student_id=sa.student_id AND spl.institute_id=sa.institute_id JOIN public.parents pa ON pa.id=spl.parent_id AND pa.institute_id=spl.institute_id AND pa.is_active IS TRUE JOIN public.profiles p ON p.id=pa.profile_id AND p.is_active IS TRUE WHERE sa.institute_id=v_profile.institute_id AND sa.batch_id=v_event.batch_id AND sa.effective_from<=v_event.event_date AND (sa.effective_to IS NULL OR sa.effective_to>=v_event.event_date) AND pa.profile_id IS NOT NULL
    ) r CROSS JOIN (VALUES('in_app'),('email')) c(channel) ON CONFLICT DO NOTHING;
  END IF;
  RETURN to_jsonb(v_event);
END;
$$;

CREATE FUNCTION public.reschedule_schedule_event(p_event_id uuid,p_new_date date,p_new_start_time time,p_new_end_time time,p_reason text)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE v_profile public.profiles%ROWTYPE; v_old public.schedule_events%ROWTYPE; v_new public.schedule_events%ROWTYPE; v_notification_id uuid; v_message text;
BEGIN
  SELECT * INTO v_profile FROM public.profiles WHERE id=auth.uid() AND is_active IS TRUE;
  SELECT * INTO v_old FROM public.schedule_events WHERE id=p_event_id FOR UPDATE;
  IF v_old.id IS NULL THEN RAISE EXCEPTION 'PLANNER_EVENT_NOT_FOUND'; END IF;
  IF NOT public.learning_planner_admin_scope(v_old.institute_id,v_old.branch_id) THEN RAISE EXCEPTION 'PLANNER_UNAUTHORIZED'; END IF;
  IF v_old.status='cancelled' THEN RAISE EXCEPTION 'PLANNER_EVENT_CANCELLED'; ELSIF v_old.status='completed' THEN RAISE EXCEPTION 'PLANNER_EVENT_COMPLETED'; ELSIF v_old.status='rescheduled' THEN RAISE EXCEPTION 'PLANNER_EVENT_ALREADY_RESCHEDULED'; END IF;
  IF btrim(COALESCE(p_reason,''))='' OR char_length(btrim(p_reason))<3 THEN RAISE EXCEPTION 'PLANNER_REASON_REQUIRED'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(v_old.institute_id::text||'|'||p_new_date::text||'|'||COALESCE(v_old.batch_id::text,''),0));
  IF v_old.room IS NOT NULL THEN PERFORM pg_advisory_xact_lock(hashtextextended(v_old.institute_id::text||'|'||p_new_date::text||'|'||upper(btrim(v_old.room)),0)); END IF;
  IF EXISTS(SELECT 1 FROM public.schedule_events e WHERE e.institute_id=v_old.institute_id AND e.id<>v_old.id AND e.event_date=p_new_date AND e.status NOT IN ('cancelled','rescheduled') AND e.start_time<p_new_end_time AND e.end_time>p_new_start_time AND ((v_old.batch_id IS NOT NULL AND e.batch_id=v_old.batch_id) OR (v_old.room IS NOT NULL AND upper(btrim(e.room))=upper(btrim(v_old.room))))) THEN RAISE EXCEPTION 'PLANNER_EVENT_CONFLICT'; END IF;
  UPDATE public.schedule_events SET status='rescheduled',reschedule_reason=upper(btrim(p_reason)) WHERE id=v_old.id;
  INSERT INTO public.schedule_events(institute_id,branch_id,academic_year_id,batch_id,class_schedule_id,subject_id,event_date,start_time,end_time,schedule_type,status,title,description,room,exam_id,original_event_id,reschedule_reason,notification_required,created_by)
  VALUES(v_old.institute_id,v_old.branch_id,v_old.academic_year_id,v_old.batch_id,v_old.class_schedule_id,v_old.subject_id,p_new_date,p_new_start_time,p_new_end_time,v_old.schedule_type,'scheduled',v_old.title,v_old.description,v_old.room,v_old.exam_id,v_old.id,upper(btrim(p_reason)),v_old.notification_required,v_profile.id) RETURNING * INTO v_new;
  INSERT INTO public.schedule_changes(schedule_event_id,change_type,old_date,old_start_time,old_end_time,new_date,new_start_time,new_end_time,reason,changed_by) VALUES(v_old.id,'rescheduled',v_old.event_date,v_old.start_time,v_old.end_time,v_new.event_date,v_new.start_time,v_new.end_time,upper(btrim(p_reason)),v_profile.id);
  IF v_new.notification_required THEN
    v_message:=v_new.title||' was rescheduled from '||to_char(v_old.event_date,'DD Mon YYYY')||' '||to_char(v_old.start_time,'HH12:MI AM')||' to '||to_char(v_new.event_date,'DD Mon YYYY')||' '||to_char(v_new.start_time,'HH12:MI AM')||'. Reason: '||upper(btrim(p_reason));
    INSERT INTO public.notifications(institute_id,schedule_event_id,notification_type,title,message,priority,created_by) VALUES(v_new.institute_id,v_new.id,'rescheduled','Class Rescheduled',v_message,'important',v_profile.id) RETURNING id INTO v_notification_id;
    INSERT INTO public.notification_recipients(institute_id,notification_id,user_id,recipient_role,delivery_channel)
    SELECT v_new.institute_id,v_notification_id,r.user_id,r.recipient_role,c.channel FROM (SELECT DISTINCT s.profile_id user_id,'Student'::text recipient_role FROM public.student_assignments sa JOIN public.students s ON s.id=sa.student_id AND s.institute_id=sa.institute_id JOIN public.profiles p ON p.id=s.profile_id AND p.is_active IS TRUE WHERE sa.institute_id=v_new.institute_id AND sa.batch_id=v_new.batch_id AND sa.effective_from<=v_new.event_date AND (sa.effective_to IS NULL OR sa.effective_to>=v_new.event_date) AND s.profile_id IS NOT NULL UNION SELECT DISTINCT pa.profile_id,'Parent' FROM public.student_assignments sa JOIN public.student_parent_links spl ON spl.student_id=sa.student_id AND spl.institute_id=sa.institute_id JOIN public.parents pa ON pa.id=spl.parent_id AND pa.institute_id=spl.institute_id AND pa.is_active IS TRUE JOIN public.profiles p ON p.id=pa.profile_id AND p.is_active IS TRUE WHERE sa.institute_id=v_new.institute_id AND sa.batch_id=v_new.batch_id AND sa.effective_from<=v_new.event_date AND (sa.effective_to IS NULL OR sa.effective_to>=v_new.event_date) AND pa.profile_id IS NOT NULL) r CROSS JOIN (VALUES('in_app'),('email')) c(channel) ON CONFLICT DO NOTHING;
  END IF;
  RETURN to_jsonb(v_new);
END;
$$;

CREATE FUNCTION public.cancel_schedule_event(p_event_id uuid,p_reason text)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE v_profile public.profiles%ROWTYPE; v_event public.schedule_events%ROWTYPE; v_notification_id uuid;
BEGIN
  SELECT * INTO v_profile FROM public.profiles WHERE id=auth.uid() AND is_active IS TRUE;
  SELECT * INTO v_event FROM public.schedule_events WHERE id=p_event_id FOR UPDATE;
  IF v_event.id IS NULL THEN RAISE EXCEPTION 'PLANNER_EVENT_NOT_FOUND'; END IF;
  IF NOT public.learning_planner_admin_scope(v_event.institute_id,v_event.branch_id) THEN RAISE EXCEPTION 'PLANNER_UNAUTHORIZED'; END IF;
  IF v_event.status='completed' THEN RAISE EXCEPTION 'PLANNER_EVENT_COMPLETED'; ELSIF v_event.status='cancelled' THEN RAISE EXCEPTION 'PLANNER_EVENT_CANCELLED'; END IF;
  IF btrim(COALESCE(p_reason,''))='' THEN RAISE EXCEPTION 'PLANNER_REASON_REQUIRED'; END IF;
  UPDATE public.schedule_events SET status='cancelled',cancellation_reason=upper(btrim(p_reason)) WHERE id=v_event.id RETURNING * INTO v_event;
  INSERT INTO public.schedule_changes(schedule_event_id,change_type,old_date,old_start_time,old_end_time,reason,changed_by) VALUES(v_event.id,'cancelled',v_event.event_date,v_event.start_time,v_event.end_time,upper(btrim(p_reason)),v_profile.id);
  IF v_event.notification_required THEN
    INSERT INTO public.notifications(institute_id,schedule_event_id,notification_type,title,message,priority,created_by) VALUES(v_event.institute_id,v_event.id,'cancelled','Class Cancelled',v_event.title||' was cancelled. Reason: '||upper(btrim(p_reason)),'urgent',v_profile.id) RETURNING id INTO v_notification_id;
    INSERT INTO public.notification_recipients(institute_id,notification_id,user_id,recipient_role,delivery_channel)
    SELECT v_event.institute_id,v_notification_id,r.user_id,r.recipient_role,c.channel FROM (SELECT DISTINCT s.profile_id user_id,'Student'::text recipient_role FROM public.student_assignments sa JOIN public.students s ON s.id=sa.student_id AND s.institute_id=sa.institute_id JOIN public.profiles p ON p.id=s.profile_id AND p.is_active IS TRUE WHERE sa.institute_id=v_event.institute_id AND sa.batch_id=v_event.batch_id AND sa.effective_from<=v_event.event_date AND (sa.effective_to IS NULL OR sa.effective_to>=v_event.event_date) AND s.profile_id IS NOT NULL UNION SELECT DISTINCT pa.profile_id,'Parent' FROM public.student_assignments sa JOIN public.student_parent_links spl ON spl.student_id=sa.student_id AND spl.institute_id=sa.institute_id JOIN public.parents pa ON pa.id=spl.parent_id AND pa.institute_id=spl.institute_id AND pa.is_active IS TRUE JOIN public.profiles p ON p.id=pa.profile_id AND p.is_active IS TRUE WHERE sa.institute_id=v_event.institute_id AND sa.batch_id=v_event.batch_id AND sa.effective_from<=v_event.event_date AND (sa.effective_to IS NULL OR sa.effective_to>=v_event.event_date) AND pa.profile_id IS NOT NULL) r CROSS JOIN (VALUES('in_app'),('email')) c(channel) ON CONFLICT DO NOTHING;
  END IF;
  RETURN to_jsonb(v_event);
END;
$$;

CREATE FUNCTION public.complete_schedule_event(p_event_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE v_profile public.profiles%ROWTYPE; v_event public.schedule_events%ROWTYPE;
BEGIN
  SELECT * INTO v_profile FROM public.profiles WHERE id=auth.uid() AND is_active IS TRUE;
  SELECT * INTO v_event FROM public.schedule_events WHERE id=p_event_id FOR UPDATE;
  IF v_event.id IS NULL THEN RAISE EXCEPTION 'PLANNER_EVENT_NOT_FOUND'; END IF;
  IF NOT public.learning_planner_admin_scope(v_event.institute_id,v_event.branch_id) THEN RAISE EXCEPTION 'PLANNER_UNAUTHORIZED'; END IF;
  IF v_event.status<>'scheduled' THEN RAISE EXCEPTION 'PLANNER_EVENT_NOT_COMPLETABLE'; END IF;
  UPDATE public.schedule_events SET status='completed' WHERE id=v_event.id RETURNING * INTO v_event;
  INSERT INTO public.schedule_changes(schedule_event_id,change_type,old_date,old_start_time,old_end_time,new_date,new_start_time,new_end_time,changed_by) VALUES(v_event.id,'completed',v_event.event_date,v_event.start_time,v_event.end_time,v_event.event_date,v_event.start_time,v_event.end_time,v_profile.id);
  RETURN to_jsonb(v_event);
END;
$$;

CREATE FUNCTION public.mark_schedule_notification_read(p_recipient_id uuid)
RETURNS timestamptz LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE v_read_at timestamptz;
BEGIN
  UPDATE public.notification_recipients SET read_at=COALESCE(read_at,now()) WHERE id=p_recipient_id AND user_id=auth.uid() RETURNING read_at INTO v_read_at;
  IF v_read_at IS NULL THEN RAISE EXCEPTION 'PLANNER_NOTIFICATION_NOT_FOUND'; END IF;
  RETURN v_read_at;
END;
$$;

REVOKE ALL ON FUNCTION public.learning_planner_set_updated_at() FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.learning_planner_admin_scope(uuid,uuid) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.create_schedule_event(jsonb) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.reschedule_schedule_event(uuid,date,time,time,text) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.cancel_schedule_event(uuid,text) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.complete_schedule_event(uuid) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.mark_schedule_notification_read(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.learning_planner_admin_scope(uuid,uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_schedule_event(jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reschedule_schedule_event(uuid,date,time,time,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_schedule_event(uuid,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.complete_schedule_event(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_schedule_notification_read(uuid) TO authenticated;

COMMENT ON TABLE public.class_schedules IS 'Recurring weekly Learning Planner definitions. Module 06B will materialize bounded event ranges.';
COMMENT ON TABLE public.schedule_events IS 'Dated Learning Planner events. Rescheduling preserves originals and creates replacement rows.';
COMMENT ON TABLE public.schedule_changes IS 'Immutable Learning Planner lifecycle history; normal flows never update or delete rows.';
COMMENT ON COLUMN public.schedule_events.exam_id IS 'Reserved for a future Examination foreign key.';
COMMENT ON COLUMN public.schedule_events.original_event_id IS 'Original event replaced by this event during rescheduling.';

COMMIT;
