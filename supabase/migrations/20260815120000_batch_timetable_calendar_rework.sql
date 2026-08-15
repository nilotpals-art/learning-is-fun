BEGIN;

ALTER TABLE public.batches
  ADD COLUMN academic_year_id uuid,
  ADD COLUMN branch_id uuid;

UPDATE public.batches b
SET academic_year_id = COALESCE(
  (SELECT sa.academic_year_id FROM public.student_assignments sa WHERE sa.batch_id=b.id ORDER BY sa.effective_from DESC LIMIT 1),
  (SELECT ay.id FROM public.academic_years ay WHERE ay.institute_id=b.institute_id AND ay.is_current IS TRUE ORDER BY ay.start_date DESC LIMIT 1)
)
WHERE b.academic_year_id IS NULL;

ALTER TABLE public.batches
  ADD CONSTRAINT batches_academic_year_fkey FOREIGN KEY (academic_year_id,institute_id) REFERENCES public.academic_years(id,institute_id) ON DELETE RESTRICT,
  ADD CONSTRAINT batches_branch_fkey FOREIGN KEY (branch_id,institute_id) REFERENCES public.branches(id,institute_id) ON DELETE RESTRICT,
  ADD CONSTRAINT batches_teaching_identity_check CHECK (academic_year_id IS NOT NULL AND board_id IS NOT NULL AND class_id IS NOT NULL AND subject_id IS NOT NULL) NOT VALID;

CREATE UNIQUE INDEX batches_active_academic_identity_key
ON public.batches(institute_id,COALESCE(branch_id,'00000000-0000-0000-0000-000000000000'::uuid),academic_year_id,board_id,class_id,subject_id,upper(btrim(name)))
WHERE is_active IS TRUE AND academic_year_id IS NOT NULL AND board_id IS NOT NULL AND class_id IS NOT NULL AND subject_id IS NOT NULL;

CREATE INDEX batches_academic_year_idx ON public.batches(institute_id,academic_year_id);
CREATE INDEX batches_branch_idx ON public.batches(institute_id,branch_id);

ALTER TABLE public.schedule_events
  DROP CONSTRAINT schedule_events_type_check,
  ADD CONSTRAINT schedule_events_type_check CHECK (schedule_type IN ('regular_class','extra_class','practice_work','practice_test','mock_test','exam','parent_meeting','holiday','special_class')),
  ADD COLUMN related_event_id uuid,
  ADD COLUMN reschedule_pending boolean NOT NULL DEFAULT false,
  ADD COLUMN reschedule_pending_resolved_at timestamptz,
  ADD COLUMN reschedule_pending_resolved_by uuid,
  ADD CONSTRAINT schedule_events_related_event_fkey FOREIGN KEY (related_event_id,institute_id) REFERENCES public.schedule_events(id,institute_id) ON DELETE RESTRICT,
  ADD CONSTRAINT schedule_events_pending_resolved_by_fkey FOREIGN KEY (reschedule_pending_resolved_by,institute_id) REFERENCES public.profiles(id,institute_id) ON DELETE RESTRICT,
  ADD CONSTRAINT schedule_events_pending_check CHECK ((reschedule_pending IS FALSE) OR (status='cancelled' AND schedule_type='regular_class'));

ALTER TABLE public.class_schedules
  DROP CONSTRAINT class_schedules_type_check,
  ADD CONSTRAINT class_schedules_type_check CHECK (schedule_type IN ('regular_class','extra_class','practice_work','practice_test','mock_test','exam','parent_meeting','holiday','special_class'));

CREATE INDEX schedule_events_related_event_idx ON public.schedule_events(related_event_id) WHERE related_event_id IS NOT NULL;
CREATE INDEX schedule_events_pending_idx ON public.schedule_events(institute_id,reschedule_pending) WHERE reschedule_pending IS TRUE;

CREATE TABLE public.batch_schedule_overlap_approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), institute_id uuid NOT NULL, branch_id uuid, proposed_batch_id uuid NOT NULL,
  proposed_schedule_id uuid NOT NULL, conflicting_batch_id uuid NOT NULL, conflicting_schedule_id uuid NOT NULL,
  day_of_week smallint NOT NULL CHECK(day_of_week BETWEEN 1 AND 7), existing_start_time time NOT NULL, existing_end_time time NOT NULL,
  proposed_start_time time NOT NULL, proposed_end_time time NOT NULL, reason text, approved_by uuid NOT NULL,
  approved_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT batch_overlap_institute_fkey FOREIGN KEY(institute_id) REFERENCES public.institutes(id) ON DELETE RESTRICT,
  CONSTRAINT batch_overlap_branch_fkey FOREIGN KEY(branch_id,institute_id) REFERENCES public.branches(id,institute_id) ON DELETE RESTRICT,
  CONSTRAINT batch_overlap_proposed_batch_fkey FOREIGN KEY(proposed_batch_id,institute_id) REFERENCES public.batches(id,institute_id) ON DELETE RESTRICT,
  CONSTRAINT batch_overlap_proposed_schedule_fkey FOREIGN KEY(proposed_schedule_id,institute_id) REFERENCES public.class_schedules(id,institute_id) ON DELETE RESTRICT,
  CONSTRAINT batch_overlap_conflicting_batch_fkey FOREIGN KEY(conflicting_batch_id,institute_id) REFERENCES public.batches(id,institute_id) ON DELETE RESTRICT,
  CONSTRAINT batch_overlap_conflicting_schedule_fkey FOREIGN KEY(conflicting_schedule_id,institute_id) REFERENCES public.class_schedules(id,institute_id) ON DELETE RESTRICT,
  CONSTRAINT batch_overlap_approved_by_fkey FOREIGN KEY(approved_by,institute_id) REFERENCES public.profiles(id,institute_id) ON DELETE RESTRICT
);
CREATE INDEX batch_overlap_scope_idx ON public.batch_schedule_overlap_approvals(institute_id,approved_at DESC);

CREATE TABLE public.planner_message_outbox (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), institute_id uuid NOT NULL, branch_id uuid, schedule_event_id uuid NOT NULL,
  recipient_user_id uuid NOT NULL, recipient_role text NOT NULL CHECK(recipient_role IN ('Student','Parent')),
  recipient_phone text NOT NULL, message_type text NOT NULL, template_name text, template_parameters jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'queued' CHECK(status IN ('queued','processing','sent','failed','not_configured','cancelled')),
  attempt_count integer NOT NULL DEFAULT 0 CHECK(attempt_count>=0), last_error_code text, provider_message_id text,
  idempotency_key text NOT NULL, initiated_by uuid NOT NULL, scheduled_for timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT planner_outbox_institute_fkey FOREIGN KEY(institute_id) REFERENCES public.institutes(id) ON DELETE RESTRICT,
  CONSTRAINT planner_outbox_branch_fkey FOREIGN KEY(branch_id,institute_id) REFERENCES public.branches(id,institute_id) ON DELETE RESTRICT,
  CONSTRAINT planner_outbox_event_fkey FOREIGN KEY(schedule_event_id,institute_id) REFERENCES public.schedule_events(id,institute_id) ON DELETE RESTRICT,
  CONSTRAINT planner_outbox_recipient_fkey FOREIGN KEY(recipient_user_id,institute_id) REFERENCES public.profiles(id,institute_id) ON DELETE RESTRICT,
  CONSTRAINT planner_outbox_initiated_by_fkey FOREIGN KEY(initiated_by,institute_id) REFERENCES public.profiles(id,institute_id) ON DELETE RESTRICT,
  CONSTRAINT planner_outbox_idempotency_key UNIQUE(institute_id,idempotency_key)
);
CREATE INDEX planner_outbox_queue_idx ON public.planner_message_outbox(status,scheduled_for) WHERE status IN ('queued','failed');
CREATE INDEX planner_outbox_event_idx ON public.planner_message_outbox(institute_id,schedule_event_id);

ALTER TABLE public.batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.batch_schedule_overlap_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.planner_message_outbox ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.batches,public.batch_schedule_overlap_approvals,public.planner_message_outbox FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.batches TO authenticated;
GRANT SELECT ON public.batch_schedule_overlap_approvals,public.planner_message_outbox TO authenticated;

CREATE POLICY batches_admin_select ON public.batches FOR SELECT TO authenticated USING(public.learning_planner_admin_scope(institute_id,branch_id));
CREATE POLICY batches_student_select ON public.batches FOR SELECT TO authenticated USING(EXISTS(SELECT 1 FROM public.students s JOIN public.student_assignments sa ON sa.student_id=s.id AND sa.institute_id=s.institute_id WHERE s.profile_id=(SELECT auth.uid()) AND sa.institute_id=batches.institute_id AND sa.batch_id=batches.id));
CREATE POLICY batches_parent_select ON public.batches FOR SELECT TO authenticated USING(EXISTS(SELECT 1 FROM public.parents p JOIN public.student_parent_links spl ON spl.parent_id=p.id AND spl.institute_id=p.institute_id JOIN public.student_assignments sa ON sa.student_id=spl.student_id AND sa.institute_id=spl.institute_id WHERE p.profile_id=(SELECT auth.uid()) AND sa.institute_id=batches.institute_id AND sa.batch_id=batches.id));
CREATE POLICY batch_overlap_admin_select ON public.batch_schedule_overlap_approvals FOR SELECT TO authenticated USING(public.learning_planner_admin_scope(institute_id,branch_id));
CREATE POLICY planner_outbox_admin_select ON public.planner_message_outbox FOR SELECT TO authenticated USING(public.learning_planner_admin_scope(institute_id,branch_id));

CREATE OR REPLACE FUNCTION public.create_teaching_batch(p_input jsonb,p_approve_overlap boolean DEFAULT false)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_profile public.profiles%ROWTYPE; v_batch public.batches%ROWTYPE; v_group jsonb; v_day text; v_schedule_id uuid; v_conflict record; v_conflicts jsonb:='[]'::jsonb; v_created jsonb:='[]'::jsonb;
BEGIN
 SELECT * INTO v_profile FROM public.profiles WHERE id=(SELECT auth.uid()) AND is_active IS TRUE AND role IN ('Administrator','Super Admin','admin','Institute Admin');
 IF v_profile.id IS NULL OR v_profile.institute_id IS NULL THEN RAISE EXCEPTION 'BATCH_UNAUTHORIZED'; END IF;
 IF v_profile.branch_id IS NOT NULL AND NULLIF(p_input->>'branchId','')::uuid IS DISTINCT FROM v_profile.branch_id THEN RAISE EXCEPTION 'BATCH_BRANCH_INVALID'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.academic_years WHERE id=(p_input->>'academicYearId')::uuid AND institute_id=v_profile.institute_id AND is_active IS TRUE) THEN RAISE EXCEPTION 'BATCH_ACADEMIC_YEAR_INVALID'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.boards WHERE id=(p_input->>'boardId')::uuid AND institute_id=v_profile.institute_id) THEN RAISE EXCEPTION 'BATCH_BOARD_INVALID'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.academic_classes WHERE id=(p_input->>'classId')::uuid AND institute_id=v_profile.institute_id) THEN RAISE EXCEPTION 'BATCH_CLASS_INVALID'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.subjects WHERE id=(p_input->>'subjectId')::uuid AND institute_id=v_profile.institute_id) THEN RAISE EXCEPTION 'BATCH_SUBJECT_INVALID'; END IF;
 IF jsonb_array_length(COALESCE(p_input->'schedules','[]'::jsonb))=0 THEN RAISE EXCEPTION 'BATCH_SCHEDULE_REQUIRED'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(v_profile.institute_id::text||'|BATCH|'||upper(btrim(p_input->>'name')),0));
 IF EXISTS(SELECT 1 FROM public.batches b WHERE b.institute_id=v_profile.institute_id AND b.branch_id IS NOT DISTINCT FROM NULLIF(p_input->>'branchId','')::uuid AND b.academic_year_id=(p_input->>'academicYearId')::uuid AND b.board_id=(p_input->>'boardId')::uuid AND b.class_id=(p_input->>'classId')::uuid AND b.subject_id=(p_input->>'subjectId')::uuid AND upper(btrim(b.name))=upper(btrim(p_input->>'name')) AND b.is_active IS TRUE) THEN RAISE EXCEPTION 'BATCH_DUPLICATE_IDENTITY'; END IF;
 FOR v_group IN SELECT value FROM jsonb_array_elements(p_input->'schedules') LOOP
   IF (v_group->>'endTime')::time <= (v_group->>'startTime')::time OR jsonb_array_length(COALESCE(v_group->'days','[]'))=0 THEN RAISE EXCEPTION 'BATCH_SCHEDULE_INVALID'; END IF;
   FOR v_day IN SELECT jsonb_array_elements_text(v_group->'days') LOOP
     FOR v_conflict IN SELECT cs.id schedule_id,cs.batch_id,b.name batch_name,cs.day_of_week,cs.start_time,cs.end_time FROM public.class_schedules cs JOIN public.batches b ON b.id=cs.batch_id AND b.institute_id=cs.institute_id WHERE cs.institute_id=v_profile.institute_id AND cs.branch_id IS NOT DISTINCT FROM NULLIF(p_input->>'branchId','')::uuid AND cs.day_of_week=v_day::smallint AND cs.is_active IS TRUE AND cs.start_time<(v_group->>'endTime')::time AND cs.end_time>(v_group->>'startTime')::time LOOP
       v_conflicts:=v_conflicts||jsonb_build_array(jsonb_build_object('scheduleId',v_conflict.schedule_id,'batchId',v_conflict.batch_id,'batchName',v_conflict.batch_name,'dayOfWeek',v_conflict.day_of_week,'existingStartTime',to_char(v_conflict.start_time,'HH24:MI'),'existingEndTime',to_char(v_conflict.end_time,'HH24:MI'),'proposedStartTime',v_group->>'startTime','proposedEndTime',v_group->>'endTime'));
     END LOOP;
   END LOOP;
 END LOOP;
 IF jsonb_array_length(v_conflicts)>0 AND NOT p_approve_overlap THEN RETURN jsonb_build_object('status','conflict','conflicts',v_conflicts); END IF;
 INSERT INTO public.batches(institute_id,branch_id,academic_year_id,board_id,class_id,subject_id,name,is_active) VALUES(v_profile.institute_id,NULLIF(p_input->>'branchId','')::uuid,(p_input->>'academicYearId')::uuid,(p_input->>'boardId')::uuid,(p_input->>'classId')::uuid,(p_input->>'subjectId')::uuid,upper(btrim(p_input->>'name')),true) RETURNING * INTO v_batch;
 FOR v_group IN SELECT value FROM jsonb_array_elements(p_input->'schedules') LOOP FOR v_day IN SELECT jsonb_array_elements_text(v_group->'days') LOOP
   INSERT INTO public.class_schedules(institute_id,branch_id,academic_year_id,batch_id,subject_id,day_of_week,start_time,end_time,schedule_type,effective_from,is_active,created_by) VALUES(v_profile.institute_id,v_batch.branch_id,v_batch.academic_year_id,v_batch.id,v_batch.subject_id,v_day::smallint,(v_group->>'startTime')::time,(v_group->>'endTime')::time,'regular_class',(p_input->>'effectiveFrom')::date,true,v_profile.id) RETURNING id INTO v_schedule_id;
   v_created:=v_created||jsonb_build_array(v_schedule_id);
   IF p_approve_overlap THEN FOR v_conflict IN SELECT cs.id schedule_id,cs.batch_id,cs.start_time,cs.end_time FROM public.class_schedules cs WHERE cs.institute_id=v_profile.institute_id AND cs.id<>v_schedule_id AND cs.branch_id IS NOT DISTINCT FROM v_batch.branch_id AND cs.day_of_week=v_day::smallint AND cs.is_active IS TRUE AND cs.start_time<(v_group->>'endTime')::time AND cs.end_time>(v_group->>'startTime')::time LOOP INSERT INTO public.batch_schedule_overlap_approvals(institute_id,branch_id,proposed_batch_id,proposed_schedule_id,conflicting_batch_id,conflicting_schedule_id,day_of_week,existing_start_time,existing_end_time,proposed_start_time,proposed_end_time,reason,approved_by) VALUES(v_profile.institute_id,v_batch.branch_id,v_batch.id,v_schedule_id,v_conflict.batch_id,v_conflict.schedule_id,v_day::smallint,v_conflict.start_time,v_conflict.end_time,(v_group->>'startTime')::time,(v_group->>'endTime')::time,NULLIF(upper(btrim(p_input->>'overlapReason')),''),v_profile.id); END LOOP; END IF;
 END LOOP; END LOOP;
 RETURN jsonb_build_object('status','success','batchId',v_batch.id,'scheduleIds',v_created,'conflicts',v_conflicts);
END $$;

CREATE OR REPLACE FUNCTION public.replace_batch_timetable(p_batch_id uuid,p_effective_from date,p_schedules jsonb,p_approve_overlap boolean DEFAULT false,p_reason text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_profile public.profiles%ROWTYPE; v_batch public.batches%ROWTYPE; v_group jsonb; v_day text; v_conflict record; v_conflicts jsonb:='[]'::jsonb; v_schedule_id uuid;
BEGIN
 SELECT * INTO v_profile FROM public.profiles WHERE id=(SELECT auth.uid()) AND is_active IS TRUE AND role IN ('Administrator','Super Admin','admin','Institute Admin');
 SELECT * INTO v_batch FROM public.batches WHERE id=p_batch_id AND institute_id=v_profile.institute_id FOR UPDATE;
 IF v_batch.id IS NULL THEN RAISE EXCEPTION 'BATCH_NOT_FOUND'; END IF;
 IF p_effective_from<=current_date THEN RAISE EXCEPTION 'BATCH_EFFECTIVE_FROM_FUTURE'; END IF;
 IF jsonb_array_length(COALESCE(p_schedules,'[]'))=0 THEN RAISE EXCEPTION 'BATCH_SCHEDULE_REQUIRED'; END IF;
 FOR v_group IN SELECT value FROM jsonb_array_elements(p_schedules) LOOP FOR v_day IN SELECT jsonb_array_elements_text(v_group->'days') LOOP FOR v_conflict IN SELECT cs.id,cs.batch_id,b.name,cs.day_of_week,cs.start_time,cs.end_time FROM public.class_schedules cs JOIN public.batches b ON b.id=cs.batch_id WHERE cs.institute_id=v_batch.institute_id AND cs.batch_id<>v_batch.id AND cs.branch_id IS NOT DISTINCT FROM v_batch.branch_id AND cs.day_of_week=v_day::smallint AND cs.is_active IS TRUE AND cs.start_time<(v_group->>'endTime')::time AND cs.end_time>(v_group->>'startTime')::time LOOP v_conflicts:=v_conflicts||jsonb_build_array(jsonb_build_object('scheduleId',v_conflict.id,'batchId',v_conflict.batch_id,'batchName',v_conflict.name,'dayOfWeek',v_conflict.day_of_week,'existingStartTime',to_char(v_conflict.start_time,'HH24:MI'),'existingEndTime',to_char(v_conflict.end_time,'HH24:MI'),'proposedStartTime',v_group->>'startTime','proposedEndTime',v_group->>'endTime')); END LOOP; END LOOP; END LOOP;
 IF jsonb_array_length(v_conflicts)>0 AND NOT p_approve_overlap THEN RETURN jsonb_build_object('status','conflict','conflicts',v_conflicts); END IF;
 UPDATE public.class_schedules SET effective_to=p_effective_from-1,is_active=false,updated_at=now() WHERE batch_id=v_batch.id AND institute_id=v_batch.institute_id AND is_active IS TRUE AND effective_from<p_effective_from;
 DELETE FROM public.class_schedules WHERE batch_id=v_batch.id AND institute_id=v_batch.institute_id AND effective_from>=p_effective_from AND NOT EXISTS(SELECT 1 FROM public.schedule_events e WHERE e.class_schedule_id=class_schedules.id);
 FOR v_group IN SELECT value FROM jsonb_array_elements(p_schedules) LOOP FOR v_day IN SELECT jsonb_array_elements_text(v_group->'days') LOOP INSERT INTO public.class_schedules(institute_id,branch_id,academic_year_id,batch_id,subject_id,day_of_week,start_time,end_time,schedule_type,effective_from,is_active,created_by) VALUES(v_batch.institute_id,v_batch.branch_id,v_batch.academic_year_id,v_batch.id,v_batch.subject_id,v_day::smallint,(v_group->>'startTime')::time,(v_group->>'endTime')::time,'regular_class',p_effective_from,true,v_profile.id) RETURNING id INTO v_schedule_id; IF p_approve_overlap THEN FOR v_conflict IN SELECT cs.id,cs.batch_id,cs.start_time,cs.end_time FROM public.class_schedules cs WHERE cs.institute_id=v_batch.institute_id AND cs.id<>v_schedule_id AND cs.batch_id<>v_batch.id AND cs.branch_id IS NOT DISTINCT FROM v_batch.branch_id AND cs.day_of_week=v_day::smallint AND cs.is_active IS TRUE AND cs.start_time<(v_group->>'endTime')::time AND cs.end_time>(v_group->>'startTime')::time LOOP INSERT INTO public.batch_schedule_overlap_approvals(institute_id,branch_id,proposed_batch_id,proposed_schedule_id,conflicting_batch_id,conflicting_schedule_id,day_of_week,existing_start_time,existing_end_time,proposed_start_time,proposed_end_time,reason,approved_by) VALUES(v_batch.institute_id,v_batch.branch_id,v_batch.id,v_schedule_id,v_conflict.batch_id,v_conflict.id,v_day::smallint,v_conflict.start_time,v_conflict.end_time,(v_group->>'startTime')::time,(v_group->>'endTime')::time,NULLIF(upper(btrim(p_reason)),''),v_profile.id); END LOOP; END IF; END LOOP; END LOOP;
 RETURN jsonb_build_object('status','success','batchId',v_batch.id,'conflicts',v_conflicts);
END $$;

CREATE OR REPLACE FUNCTION public.queue_planner_whatsapp(p_event_id uuid,p_message_type text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_profile public.profiles%ROWTYPE; v_event public.schedule_events%ROWTYPE; v_count integer:=0; v_rec record; v_phone text;
BEGIN
 SELECT * INTO v_profile FROM public.profiles WHERE id=(SELECT auth.uid()) AND is_active IS TRUE AND role IN ('Administrator','Super Admin','admin','Institute Admin');
 SELECT * INTO v_event FROM public.schedule_events WHERE id=p_event_id AND institute_id=v_profile.institute_id;
 IF v_event.id IS NULL THEN RAISE EXCEPTION 'PLANNER_EVENT_NOT_FOUND'; END IF;
 IF v_event.batch_id IS NULL THEN RETURN jsonb_build_object('status','no_recipients','queuedCount',0); END IF;
 FOR v_rec IN SELECT DISTINCT s.profile_id user_id,'Student' role,s.mobile phone FROM public.student_assignments sa JOIN public.students s ON s.id=sa.student_id AND s.institute_id=sa.institute_id WHERE sa.institute_id=v_event.institute_id AND sa.batch_id=v_event.batch_id AND sa.effective_from<=v_event.event_date AND (sa.effective_to IS NULL OR sa.effective_to>=v_event.event_date) AND s.profile_id IS NOT NULL UNION SELECT DISTINCT p.profile_id,'Parent',p.mobile FROM public.student_assignments sa JOIN public.student_parent_links spl ON spl.student_id=sa.student_id AND spl.institute_id=sa.institute_id JOIN public.parents p ON p.id=spl.parent_id AND p.institute_id=spl.institute_id WHERE sa.institute_id=v_event.institute_id AND sa.batch_id=v_event.batch_id AND sa.effective_from<=v_event.event_date AND (sa.effective_to IS NULL OR sa.effective_to>=v_event.event_date) AND p.profile_id IS NOT NULL LOOP
   v_phone:=NULLIF(regexp_replace(COALESCE(v_rec.phone,''),'[^0-9+]','','g'),''); IF v_phone IS NULL THEN CONTINUE; END IF;
   INSERT INTO public.planner_message_outbox(institute_id,branch_id,schedule_event_id,recipient_user_id,recipient_role,recipient_phone,message_type,template_parameters,status,idempotency_key,initiated_by) VALUES(v_event.institute_id,v_event.branch_id,v_event.id,v_rec.user_id,v_rec.role,v_phone,p_message_type,jsonb_build_object('title',v_event.title,'date',v_event.event_date,'startTime',v_event.start_time,'endTime',v_event.end_time),'queued',p_message_type||':'||v_event.id||':'||v_rec.user_id,v_profile.id) ON CONFLICT(institute_id,idempotency_key) DO NOTHING; IF FOUND THEN v_count:=v_count+1; END IF;
 END LOOP;
 RETURN jsonb_build_object('status',CASE WHEN v_count>0 THEN 'queued' ELSE 'no_recipients' END,'queuedCount',v_count);
END $$;

CREATE OR REPLACE FUNCTION public.create_planner_event(p_input jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_profile public.profiles%ROWTYPE; v_batch public.batches%ROWTYPE; v_subject uuid; v_year uuid; v_payload jsonb; v_result jsonb; v_event_id uuid;
BEGIN
 SELECT * INTO v_profile FROM public.profiles WHERE id=(SELECT auth.uid()) AND is_active IS TRUE AND role IN ('Administrator','Super Admin','admin','Institute Admin');
 IF v_profile.id IS NULL THEN RAISE EXCEPTION 'PLANNER_UNAUTHORIZED'; END IF;
 IF NULLIF(p_input->>'batchId','') IS NOT NULL THEN SELECT * INTO v_batch FROM public.batches WHERE id=(p_input->>'batchId')::uuid AND institute_id=v_profile.institute_id AND is_active IS TRUE; IF v_batch.id IS NULL THEN RAISE EXCEPTION 'PLANNER_BATCH_INVALID'; END IF; END IF;
 IF p_input->>'scheduleType'='regular_class' THEN IF v_batch.id IS NULL OR v_batch.subject_id IS NULL OR v_batch.academic_year_id IS NULL THEN RAISE EXCEPTION 'PLANNER_BATCH_CONTEXT_INVALID'; END IF; v_subject:=v_batch.subject_id;v_year:=v_batch.academic_year_id;
 ELSIF p_input->>'scheduleType' IN ('parent_meeting','holiday') THEN v_subject:=NULL;v_year:=COALESCE(NULLIF(p_input->>'academicYearId','')::uuid,v_batch.academic_year_id);
 ELSE v_subject:=NULLIF(p_input->>'subjectId','')::uuid;v_year:=COALESCE(NULLIF(p_input->>'academicYearId','')::uuid,v_batch.academic_year_id); END IF;
 IF v_year IS NULL OR NOT EXISTS(SELECT 1 FROM public.academic_years WHERE id=v_year AND institute_id=v_profile.institute_id) THEN RAISE EXCEPTION 'PLANNER_ACADEMIC_YEAR_INVALID'; END IF;
 IF v_subject IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.subjects WHERE id=v_subject AND institute_id=v_profile.institute_id) THEN RAISE EXCEPTION 'PLANNER_SUBJECT_INVALID'; END IF;
 IF NULLIF(p_input->>'relatedEventId','') IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.schedule_events WHERE id=(p_input->>'relatedEventId')::uuid AND institute_id=v_profile.institute_id) THEN RAISE EXCEPTION 'PLANNER_RELATED_EVENT_INVALID'; END IF;
 v_payload:=p_input||jsonb_build_object('academicYearId',v_year,'subjectId',v_subject,'branchId',COALESCE(NULLIF(p_input->>'branchId',''),v_batch.branch_id::text,''));
 v_result:=public.create_schedule_event(v_payload);v_event_id:=(v_result->>'id')::uuid;
 IF v_event_id IS NULL THEN v_event_id:=(v_result->>'event_id')::uuid; END IF;
 IF NULLIF(p_input->>'relatedEventId','') IS NOT NULL THEN UPDATE public.schedule_events SET related_event_id=(p_input->>'relatedEventId')::uuid WHERE id=v_event_id; END IF;
 RETURN (SELECT to_jsonb(e) FROM public.schedule_events e WHERE e.id=v_event_id);
END $$;

CREATE OR REPLACE FUNCTION public.cancel_planner_event(p_event_id uuid,p_reason text,p_reschedule_pending boolean DEFAULT false)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_profile public.profiles%ROWTYPE;v_event public.schedule_events%ROWTYPE;v_result jsonb;
BEGIN
 SELECT * INTO v_profile FROM public.profiles WHERE id=(SELECT auth.uid()) AND is_active IS TRUE AND role IN ('Administrator','Super Admin','admin','Institute Admin');
 SELECT * INTO v_event FROM public.schedule_events WHERE id=p_event_id AND institute_id=v_profile.institute_id;
 IF v_event.id IS NULL THEN RAISE EXCEPTION 'PLANNER_EVENT_NOT_FOUND'; END IF;
 IF p_reschedule_pending AND v_event.schedule_type<>'regular_class' THEN RAISE EXCEPTION 'PLANNER_PENDING_REGULAR_ONLY'; END IF;
 v_result:=public.cancel_schedule_event(p_event_id,p_reason);
 UPDATE public.schedule_events SET reschedule_pending=p_reschedule_pending WHERE id=p_event_id RETURNING * INTO v_event;
 IF p_reschedule_pending THEN UPDATE public.notifications SET message=message||' Rescheduled class details will be updated soon.' WHERE schedule_event_id=p_event_id AND notification_type='cancelled'; END IF;
 RETURN to_jsonb(v_event);
END $$;

CREATE OR REPLACE FUNCTION public.schedule_pending_replacement(p_event_id uuid,p_new_date date,p_new_start_time time,p_new_end_time time,p_reason text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_profile public.profiles%ROWTYPE;v_old public.schedule_events%ROWTYPE;v_new public.schedule_events%ROWTYPE;
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
 INSERT INTO public.notifications(institute_id,schedule_event_id,notification_type,title,message,priority,created_by) VALUES(v_new.institute_id,v_new.id,'rescheduled','Replacement Class Scheduled','The cancelled class has been rescheduled to '||to_char(p_new_date,'DD Mon YYYY')||' at '||to_char(p_new_start_time,'HH12:MI AM')||'.','important',v_profile.id);
 RETURN to_jsonb(v_new);
END $$;

REVOKE ALL ON FUNCTION public.create_teaching_batch(jsonb,boolean),public.replace_batch_timetable(uuid,date,jsonb,boolean,text),public.queue_planner_whatsapp(uuid,text),public.create_planner_event(jsonb),public.cancel_planner_event(uuid,text,boolean),public.schedule_pending_replacement(uuid,date,time,time,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.create_teaching_batch(jsonb,boolean),public.replace_batch_timetable(uuid,date,jsonb,boolean,text),public.queue_planner_whatsapp(uuid,text),public.create_planner_event(jsonb),public.cancel_planner_event(uuid,text,boolean),public.schedule_pending_replacement(uuid,date,time,time,text) TO authenticated;

COMMIT;
