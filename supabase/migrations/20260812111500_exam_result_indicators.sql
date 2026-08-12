BEGIN;
ALTER TABLE public.exam_student_results
  ADD COLUMN result_indicator text,
  ADD COLUMN result_comment text,
  ADD COLUMN follow_up_status text,
  ADD CONSTRAINT exam_student_results_indicator_check CHECK (result_indicator IS NULL OR result_indicator IN ('excellent','good','improvement_required','parent_call_required','not_assessed')),
  ADD CONSTRAINT exam_student_results_comment_check CHECK (result_comment IS NULL OR char_length(result_comment)<=500),
  ADD CONSTRAINT exam_student_results_follow_up_check CHECK (follow_up_status IS NULL OR follow_up_status IN ('pending','contacted','resolved')),
  ADD CONSTRAINT exam_student_results_parent_call_check CHECK ((result_indicator='parent_call_required') OR follow_up_status IS NULL);

CREATE OR REPLACE FUNCTION public.save_exam_result_draft(p_event_id uuid,p_max_marks numeric,p_results jsonb,p_correction_reason text DEFAULT NULL)
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
  ELSE UPDATE public.exam_result_sets SET max_marks=p_max_marks,correction_reason=COALESCE(NULLIF(upper(btrim(p_correction_reason)),''),correction_reason) WHERE id=v_set.id RETURNING * INTO v_set; END IF;
  SELECT count(*) INTO v_expected FROM public.student_assignments sa JOIN public.students s ON s.id=sa.student_id AND s.institute_id=sa.institute_id WHERE sa.institute_id=v_event.institute_id AND sa.batch_id=v_event.batch_id AND sa.academic_year_id=v_event.academic_year_id AND sa.effective_from<=v_event.event_date AND (sa.effective_to IS NULL OR sa.effective_to>=v_event.event_date) AND s.status='Active';
  SELECT count(*),count(DISTINCT (x->>'studentId')) INTO v_received,v_distinct FROM jsonb_array_elements(p_results) x;
  IF v_expected=0 OR v_received<>v_expected OR v_distinct<>v_expected THEN RAISE EXCEPTION 'EXAM_ROSTER_INCOMPLETE'; END IF;
  IF EXISTS (SELECT 1 FROM jsonb_array_elements(p_results) x WHERE (x->>'marksObtained')::numeric<0 OR (x->>'marksObtained')::numeric>p_max_marks OR NULLIF(x->>'resultIndicator','') IS NOT NULL AND x->>'resultIndicator' NOT IN ('excellent','good','improvement_required','parent_call_required','not_assessed') OR NULLIF(x->>'followUpStatus','') IS NOT NULL AND (x->>'resultIndicator'<>'parent_call_required' OR x->>'followUpStatus' NOT IN ('pending','contacted','resolved')) OR NOT EXISTS (SELECT 1 FROM public.student_assignments sa WHERE sa.id=(x->>'studentAssignmentId')::uuid AND sa.student_id=(x->>'studentId')::uuid AND sa.institute_id=v_event.institute_id AND sa.batch_id=v_event.batch_id AND sa.academic_year_id=v_event.academic_year_id AND sa.effective_from<=v_event.event_date AND (sa.effective_to IS NULL OR sa.effective_to>=v_event.event_date))) THEN RAISE EXCEPTION 'EXAM_RESULT_INVALID'; END IF;
  DELETE FROM public.exam_student_results WHERE exam_result_set_id=v_set.id;
  INSERT INTO public.exam_student_results(institute_id,exam_result_set_id,student_id,student_assignment_id,marks_obtained,grade,remarks,result_indicator,result_comment,follow_up_status)
  SELECT v_event.institute_id,v_set.id,(x->>'studentId')::uuid,(x->>'studentAssignmentId')::uuid,(x->>'marksObtained')::numeric,NULLIF(upper(btrim(x->>'grade')),''),NULLIF(upper(btrim(x->>'remarks')),''),NULLIF(x->>'resultIndicator',''),NULLIF(upper(btrim(x->>'resultComment')),''),CASE WHEN x->>'resultIndicator'='parent_call_required' THEN COALESCE(NULLIF(x->>'followUpStatus',''),'pending') END FROM jsonb_array_elements(p_results) x;
  RETURN jsonb_build_object('result_set_id',v_set.id,'version_no',v_set.version_no);
END; $$;
COMMIT;
