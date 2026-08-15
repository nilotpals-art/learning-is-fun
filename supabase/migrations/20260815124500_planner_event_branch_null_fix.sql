BEGIN;
CREATE OR REPLACE FUNCTION public.create_planner_event(p_input jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_profile public.profiles%ROWTYPE; v_batch public.batches%ROWTYPE; v_subject uuid; v_year uuid; v_payload jsonb; v_result jsonb; v_event_id uuid;v_branch uuid;
BEGIN
 SELECT * INTO v_profile FROM public.profiles WHERE id=(SELECT auth.uid()) AND is_active IS TRUE AND role IN ('Administrator','Super Admin','admin','Institute Admin');
 IF v_profile.id IS NULL THEN RAISE EXCEPTION 'PLANNER_UNAUTHORIZED'; END IF;
 IF NULLIF(p_input->>'batchId','') IS NOT NULL THEN SELECT * INTO v_batch FROM public.batches WHERE id=(p_input->>'batchId')::uuid AND institute_id=v_profile.institute_id AND is_active IS TRUE; IF v_batch.id IS NULL THEN RAISE EXCEPTION 'PLANNER_BATCH_INVALID'; END IF; END IF;
 v_branch:=COALESCE(NULLIF(p_input->>'branchId','')::uuid,v_batch.branch_id);
 IF p_input->>'scheduleType'='regular_class' THEN IF v_batch.id IS NULL OR v_batch.subject_id IS NULL OR v_batch.academic_year_id IS NULL THEN RAISE EXCEPTION 'PLANNER_BATCH_CONTEXT_INVALID'; END IF; v_subject:=v_batch.subject_id;v_year:=v_batch.academic_year_id;
 ELSIF p_input->>'scheduleType' IN ('parent_meeting','holiday') THEN v_subject:=NULL;v_year:=COALESCE(NULLIF(p_input->>'academicYearId','')::uuid,v_batch.academic_year_id);
 ELSE v_subject:=NULLIF(p_input->>'subjectId','')::uuid;v_year:=COALESCE(NULLIF(p_input->>'academicYearId','')::uuid,v_batch.academic_year_id); END IF;
 IF v_year IS NULL OR NOT EXISTS(SELECT 1 FROM public.academic_years WHERE id=v_year AND institute_id=v_profile.institute_id) THEN RAISE EXCEPTION 'PLANNER_ACADEMIC_YEAR_INVALID'; END IF;
 IF v_subject IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.subjects WHERE id=v_subject AND institute_id=v_profile.institute_id) THEN RAISE EXCEPTION 'PLANNER_SUBJECT_INVALID'; END IF;
 IF v_branch IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.branches WHERE id=v_branch AND institute_id=v_profile.institute_id) THEN RAISE EXCEPTION 'PLANNER_BRANCH_INVALID';END IF;
 IF NULLIF(p_input->>'relatedEventId','') IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.schedule_events WHERE id=(p_input->>'relatedEventId')::uuid AND institute_id=v_profile.institute_id) THEN RAISE EXCEPTION 'PLANNER_RELATED_EVENT_INVALID'; END IF;
 v_payload:=p_input||jsonb_build_object('academicYearId',v_year,'subjectId',v_subject,'branchId',v_branch);
 v_result:=public.create_schedule_event(v_payload);v_event_id:=(v_result->>'id')::uuid;
 IF v_event_id IS NULL THEN v_event_id:=(v_result->>'event_id')::uuid; END IF;
 IF NULLIF(p_input->>'relatedEventId','') IS NOT NULL THEN UPDATE public.schedule_events SET related_event_id=(p_input->>'relatedEventId')::uuid WHERE id=v_event_id; END IF;
 RETURN (SELECT to_jsonb(e) FROM public.schedule_events e WHERE e.id=v_event_id);
END $$;
REVOKE ALL ON FUNCTION public.create_planner_event(jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.create_planner_event(jsonb) TO authenticated;
COMMIT;
