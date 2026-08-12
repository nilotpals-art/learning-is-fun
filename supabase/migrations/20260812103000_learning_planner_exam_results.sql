BEGIN;

CREATE TABLE public.exam_result_sets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institute_id uuid NOT NULL,
  schedule_event_id uuid NOT NULL,
  academic_year_id uuid NOT NULL,
  batch_id uuid NOT NULL,
  subject_id uuid,
  version_no integer NOT NULL CHECK (version_no > 0),
  max_marks numeric(10,2) NOT NULL CHECK (max_marks > 0),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','superseded')),
  correction_reason text,
  supersedes_result_set_id uuid,
  published_at timestamptz,
  published_by uuid,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT exam_result_sets_id_institute_key UNIQUE (id, institute_id),
  CONSTRAINT exam_result_sets_event_version_key UNIQUE (schedule_event_id, version_no),
  CONSTRAINT exam_result_sets_institute_fkey FOREIGN KEY (institute_id) REFERENCES public.institutes(id) ON DELETE RESTRICT,
  CONSTRAINT exam_result_sets_event_fkey FOREIGN KEY (schedule_event_id, institute_id) REFERENCES public.schedule_events(id, institute_id) ON DELETE RESTRICT,
  CONSTRAINT exam_result_sets_year_fkey FOREIGN KEY (academic_year_id, institute_id) REFERENCES public.academic_years(id, institute_id) ON DELETE RESTRICT,
  CONSTRAINT exam_result_sets_batch_fkey FOREIGN KEY (batch_id, institute_id) REFERENCES public.batches(id, institute_id) ON DELETE RESTRICT,
  CONSTRAINT exam_result_sets_subject_fkey FOREIGN KEY (subject_id, institute_id) REFERENCES public.subjects(id, institute_id) ON DELETE RESTRICT,
  CONSTRAINT exam_result_sets_creator_fkey FOREIGN KEY (created_by, institute_id) REFERENCES public.profiles(id, institute_id) ON DELETE RESTRICT,
  CONSTRAINT exam_result_sets_publisher_fkey FOREIGN KEY (published_by, institute_id) REFERENCES public.profiles(id, institute_id) ON DELETE RESTRICT,
  CONSTRAINT exam_result_sets_supersedes_fkey FOREIGN KEY (supersedes_result_set_id, institute_id) REFERENCES public.exam_result_sets(id, institute_id) ON DELETE RESTRICT,
  CONSTRAINT exam_result_sets_publication_check CHECK ((status = 'published' AND published_at IS NOT NULL AND published_by IS NOT NULL) OR status <> 'published')
);

CREATE UNIQUE INDEX exam_result_sets_one_draft_idx ON public.exam_result_sets(schedule_event_id) WHERE status='draft';
CREATE UNIQUE INDEX exam_result_sets_one_published_idx ON public.exam_result_sets(schedule_event_id) WHERE status='published';
CREATE INDEX exam_result_sets_scope_idx ON public.exam_result_sets(institute_id, status, created_at DESC);
CREATE INDEX exam_result_sets_event_idx ON public.exam_result_sets(schedule_event_id, version_no DESC);

CREATE TABLE public.exam_student_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institute_id uuid NOT NULL,
  exam_result_set_id uuid NOT NULL,
  student_id uuid NOT NULL,
  student_assignment_id uuid NOT NULL,
  marks_obtained numeric(10,2) NOT NULL CHECK (marks_obtained >= 0),
  grade text,
  remarks text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT exam_student_results_set_student_key UNIQUE (exam_result_set_id, student_id),
  CONSTRAINT exam_student_results_institute_fkey FOREIGN KEY (institute_id) REFERENCES public.institutes(id) ON DELETE RESTRICT,
  CONSTRAINT exam_student_results_set_fkey FOREIGN KEY (exam_result_set_id, institute_id) REFERENCES public.exam_result_sets(id, institute_id) ON DELETE RESTRICT,
  CONSTRAINT exam_student_results_student_fkey FOREIGN KEY (student_id, institute_id) REFERENCES public.students(id, institute_id) ON DELETE RESTRICT,
  CONSTRAINT exam_student_results_assignment_fkey FOREIGN KEY (student_assignment_id) REFERENCES public.student_assignments(id) ON DELETE RESTRICT,
  CONSTRAINT exam_student_results_grade_check CHECK (grade IS NULL OR (btrim(grade) <> '' AND char_length(grade) <= 30)),
  CONSTRAINT exam_student_results_remarks_check CHECK (remarks IS NULL OR char_length(remarks) <= 500)
);
CREATE INDEX exam_student_results_set_idx ON public.exam_student_results(exam_result_set_id);
CREATE INDEX exam_student_results_student_idx ON public.exam_student_results(student_id, exam_result_set_id);

CREATE TRIGGER exam_result_sets_updated_at BEFORE UPDATE ON public.exam_result_sets FOR EACH ROW EXECUTE FUNCTION public.learning_planner_set_updated_at();
CREATE TRIGGER exam_student_results_updated_at BEFORE UPDATE ON public.exam_student_results FOR EACH ROW EXECUTE FUNCTION public.learning_planner_set_updated_at();

ALTER TABLE public.exam_result_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_student_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY exam_result_sets_admin_select ON public.exam_result_sets FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.schedule_events e WHERE e.id=exam_result_sets.schedule_event_id AND public.learning_planner_admin_scope(e.institute_id,e.branch_id)));
CREATE POLICY exam_result_sets_student_select ON public.exam_result_sets FOR SELECT TO authenticated
USING (exam_result_sets.status='published' AND EXISTS (SELECT 1 FROM public.exam_student_results r JOIN public.students s ON s.id=r.student_id AND s.institute_id=r.institute_id WHERE r.exam_result_set_id=exam_result_sets.id AND s.profile_id=(SELECT auth.uid())));
CREATE POLICY exam_result_sets_parent_select ON public.exam_result_sets FOR SELECT TO authenticated
USING (exam_result_sets.status='published' AND EXISTS (SELECT 1 FROM public.exam_student_results r JOIN public.student_parent_links l ON l.student_id=r.student_id AND l.institute_id=r.institute_id JOIN public.parents p ON p.id=l.parent_id AND p.institute_id=l.institute_id WHERE r.exam_result_set_id=exam_result_sets.id AND p.profile_id=(SELECT auth.uid()) AND p.is_active IS TRUE));
CREATE POLICY exam_result_sets_admin_insert ON public.exam_result_sets FOR INSERT TO authenticated
WITH CHECK (exam_result_sets.created_by=(SELECT auth.uid()) AND EXISTS (SELECT 1 FROM public.schedule_events e WHERE e.id=exam_result_sets.schedule_event_id AND public.learning_planner_admin_scope(e.institute_id,e.branch_id)));
CREATE POLICY exam_result_sets_admin_update ON public.exam_result_sets FOR UPDATE TO authenticated
USING (exam_result_sets.status='draft' AND EXISTS (SELECT 1 FROM public.schedule_events e WHERE e.id=exam_result_sets.schedule_event_id AND public.learning_planner_admin_scope(e.institute_id,e.branch_id)))
WITH CHECK (EXISTS (SELECT 1 FROM public.schedule_events e WHERE e.id=exam_result_sets.schedule_event_id AND public.learning_planner_admin_scope(e.institute_id,e.branch_id)));

CREATE POLICY exam_student_results_admin_select ON public.exam_student_results FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.exam_result_sets rs JOIN public.schedule_events e ON e.id=rs.schedule_event_id WHERE rs.id=exam_student_results.exam_result_set_id AND public.learning_planner_admin_scope(e.institute_id,e.branch_id)));
CREATE POLICY exam_student_results_student_select ON public.exam_student_results FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.exam_result_sets rs JOIN public.students s ON s.id=exam_student_results.student_id AND s.institute_id=exam_student_results.institute_id WHERE rs.id=exam_student_results.exam_result_set_id AND rs.status='published' AND s.profile_id=(SELECT auth.uid())));
CREATE POLICY exam_student_results_parent_select ON public.exam_student_results FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.exam_result_sets rs JOIN public.student_parent_links l ON l.student_id=exam_student_results.student_id AND l.institute_id=exam_student_results.institute_id JOIN public.parents p ON p.id=l.parent_id AND p.institute_id=l.institute_id WHERE rs.id=exam_student_results.exam_result_set_id AND rs.status='published' AND p.profile_id=(SELECT auth.uid()) AND p.is_active IS TRUE));
CREATE POLICY exam_student_results_admin_insert ON public.exam_student_results FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM public.exam_result_sets rs JOIN public.schedule_events e ON e.id=rs.schedule_event_id WHERE rs.id=exam_student_results.exam_result_set_id AND rs.status='draft' AND public.learning_planner_admin_scope(e.institute_id,e.branch_id)));
CREATE POLICY exam_student_results_admin_update ON public.exam_student_results FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM public.exam_result_sets rs JOIN public.schedule_events e ON e.id=rs.schedule_event_id WHERE rs.id=exam_student_results.exam_result_set_id AND rs.status='draft' AND public.learning_planner_admin_scope(e.institute_id,e.branch_id)))
WITH CHECK (EXISTS (SELECT 1 FROM public.exam_result_sets rs JOIN public.schedule_events e ON e.id=rs.schedule_event_id WHERE rs.id=exam_student_results.exam_result_set_id AND rs.status='draft' AND public.learning_planner_admin_scope(e.institute_id,e.branch_id)));
CREATE POLICY exam_student_results_admin_delete ON public.exam_student_results FOR DELETE TO authenticated
USING (EXISTS (SELECT 1 FROM public.exam_result_sets rs JOIN public.schedule_events e ON e.id=rs.schedule_event_id WHERE rs.id=exam_student_results.exam_result_set_id AND rs.status='draft' AND public.learning_planner_admin_scope(e.institute_id,e.branch_id)));

REVOKE ALL ON public.exam_result_sets, public.exam_student_results FROM PUBLIC, anon, authenticated;
GRANT SELECT,INSERT,UPDATE ON public.exam_result_sets TO authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.exam_student_results TO authenticated;

CREATE FUNCTION public.save_exam_result_draft(p_event_id uuid,p_max_marks numeric,p_results jsonb,p_correction_reason text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE v_event public.schedule_events%ROWTYPE; v_set public.exam_result_sets%ROWTYPE; v_profile public.profiles%ROWTYPE; v_published uuid; v_expected int; v_received int; v_distinct int;
BEGIN
  SELECT * INTO v_profile FROM public.profiles WHERE id=(SELECT auth.uid()) AND is_active IS TRUE;
  SELECT * INTO v_event FROM public.schedule_events WHERE id=p_event_id FOR UPDATE;
  IF v_event.id IS NULL OR v_profile.id IS NULL OR NOT public.learning_planner_admin_scope(v_event.institute_id,v_event.branch_id) THEN RAISE EXCEPTION 'EXAM_RESULTS_UNAUTHORIZED'; END IF;
  IF v_event.schedule_type<>'exam' OR v_event.batch_id IS NULL OR v_event.status NOT IN ('scheduled','completed') THEN RAISE EXCEPTION 'EXAM_EVENT_INELIGIBLE'; END IF;
  IF p_max_marks IS NULL OR p_max_marks<=0 OR jsonb_typeof(p_results)<>'array' THEN RAISE EXCEPTION 'EXAM_RESULTS_INVALID'; END IF;
  SELECT id INTO v_published FROM public.exam_result_sets WHERE schedule_event_id=p_event_id AND status='published';
  SELECT * INTO v_set FROM public.exam_result_sets WHERE schedule_event_id=p_event_id AND status='draft' FOR UPDATE;
  IF v_set.id IS NULL THEN
    IF v_published IS NOT NULL AND NULLIF(btrim(p_correction_reason),'') IS NULL THEN RAISE EXCEPTION 'EXAM_CORRECTION_REASON_REQUIRED'; END IF;
    INSERT INTO public.exam_result_sets(institute_id,schedule_event_id,academic_year_id,batch_id,subject_id,version_no,max_marks,correction_reason,supersedes_result_set_id,created_by)
    VALUES(v_event.institute_id,v_event.id,v_event.academic_year_id,v_event.batch_id,v_event.subject_id,COALESCE((SELECT max(version_no)+1 FROM public.exam_result_sets WHERE schedule_event_id=p_event_id),1),p_max_marks,NULLIF(upper(btrim(p_correction_reason)),''),v_published,v_profile.id) RETURNING * INTO v_set;
  ELSE
    UPDATE public.exam_result_sets SET max_marks=p_max_marks,correction_reason=COALESCE(NULLIF(upper(btrim(p_correction_reason)),''),correction_reason) WHERE id=v_set.id RETURNING * INTO v_set;
  END IF;
  SELECT count(*) INTO v_expected FROM public.student_assignments sa JOIN public.students s ON s.id=sa.student_id AND s.institute_id=sa.institute_id WHERE sa.institute_id=v_event.institute_id AND sa.batch_id=v_event.batch_id AND sa.academic_year_id=v_event.academic_year_id AND sa.effective_from<=v_event.event_date AND (sa.effective_to IS NULL OR sa.effective_to>=v_event.event_date) AND s.status='Active';
  SELECT count(*),count(DISTINCT (x->>'studentId')) INTO v_received,v_distinct FROM jsonb_array_elements(p_results) x;
  IF v_expected=0 OR v_received<>v_expected OR v_distinct<>v_expected THEN RAISE EXCEPTION 'EXAM_ROSTER_INCOMPLETE'; END IF;
  IF EXISTS (SELECT 1 FROM jsonb_array_elements(p_results) x WHERE (x->>'marksObtained')::numeric<0 OR (x->>'marksObtained')::numeric>p_max_marks OR NOT EXISTS (SELECT 1 FROM public.student_assignments sa WHERE sa.id=(x->>'studentAssignmentId')::uuid AND sa.student_id=(x->>'studentId')::uuid AND sa.institute_id=v_event.institute_id AND sa.batch_id=v_event.batch_id AND sa.academic_year_id=v_event.academic_year_id AND sa.effective_from<=v_event.event_date AND (sa.effective_to IS NULL OR sa.effective_to>=v_event.event_date))) THEN RAISE EXCEPTION 'EXAM_RESULT_INVALID'; END IF;
  DELETE FROM public.exam_student_results WHERE exam_result_set_id=v_set.id;
  INSERT INTO public.exam_student_results(institute_id,exam_result_set_id,student_id,student_assignment_id,marks_obtained,grade,remarks)
  SELECT v_event.institute_id,v_set.id,(x->>'studentId')::uuid,(x->>'studentAssignmentId')::uuid,(x->>'marksObtained')::numeric,NULLIF(upper(btrim(x->>'grade')),''),NULLIF(upper(btrim(x->>'remarks')),'') FROM jsonb_array_elements(p_results) x;
  RETURN jsonb_build_object('result_set_id',v_set.id,'version_no',v_set.version_no);
END; $$;

CREATE FUNCTION public.publish_exam_result(p_event_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE v_event public.schedule_events%ROWTYPE; v_set public.exam_result_sets%ROWTYPE; v_profile public.profiles%ROWTYPE; v_count int; v_expected int; v_notification uuid;
BEGIN
  SELECT * INTO v_profile FROM public.profiles WHERE id=(SELECT auth.uid()) AND is_active IS TRUE;
  SELECT * INTO v_event FROM public.schedule_events WHERE id=p_event_id FOR UPDATE;
  IF v_event.id IS NULL OR v_profile.id IS NULL OR NOT public.learning_planner_admin_scope(v_event.institute_id,v_event.branch_id) THEN RAISE EXCEPTION 'EXAM_RESULTS_UNAUTHORIZED'; END IF;
  IF v_event.schedule_type<>'exam' OR v_event.status NOT IN ('scheduled','completed') THEN RAISE EXCEPTION 'EXAM_EVENT_INELIGIBLE'; END IF;
  SELECT * INTO v_set FROM public.exam_result_sets WHERE schedule_event_id=p_event_id AND status='draft' FOR UPDATE;
  IF v_set.id IS NULL THEN RAISE EXCEPTION 'EXAM_DRAFT_NOT_FOUND'; END IF;
  SELECT count(*) INTO v_count FROM public.exam_student_results WHERE exam_result_set_id=v_set.id;
  SELECT count(*) INTO v_expected FROM public.student_assignments sa JOIN public.students s ON s.id=sa.student_id AND s.institute_id=sa.institute_id WHERE sa.institute_id=v_event.institute_id AND sa.batch_id=v_event.batch_id AND sa.academic_year_id=v_event.academic_year_id AND sa.effective_from<=v_event.event_date AND (sa.effective_to IS NULL OR sa.effective_to>=v_event.event_date) AND s.status='Active';
  IF v_count=0 OR v_count<>v_expected OR EXISTS(SELECT 1 FROM public.exam_student_results WHERE exam_result_set_id=v_set.id AND (marks_obtained<0 OR marks_obtained>v_set.max_marks)) THEN RAISE EXCEPTION 'EXAM_ROSTER_INCOMPLETE'; END IF;
  UPDATE public.exam_result_sets SET status='superseded' WHERE schedule_event_id=p_event_id AND status='published';
  UPDATE public.exam_result_sets SET status='published',published_at=now(),published_by=v_profile.id WHERE id=v_set.id;
  BEGIN
    INSERT INTO public.notifications(institute_id,schedule_event_id,notification_type,title,message,priority,created_by) VALUES(v_event.institute_id,v_event.id,'result_published','EXAM RESULT PUBLISHED',v_event.title||' result is now available.','important',v_profile.id) RETURNING id INTO v_notification;
    INSERT INTO public.notification_recipients(institute_id,notification_id,user_id,recipient_role)
    SELECT DISTINCT v_event.institute_id,v_notification,p.id,p.role FROM public.exam_student_results r JOIN public.students s ON s.id=r.student_id JOIN public.profiles p ON p.id=s.profile_id WHERE r.exam_result_set_id=v_set.id AND p.is_active IS TRUE
    ON CONFLICT DO NOTHING;
  EXCEPTION WHEN OTHERS THEN NULL; END;
  RETURN jsonb_build_object('result_set_id',v_set.id,'version_no',v_set.version_no);
END; $$;

REVOKE ALL ON FUNCTION public.save_exam_result_draft(uuid,numeric,jsonb,text), public.publish_exam_result(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.save_exam_result_draft(uuid,numeric,jsonb,text), public.publish_exam_result(uuid) TO authenticated;

COMMIT;
