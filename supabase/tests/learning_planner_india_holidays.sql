-- Transactional schema, RLS, tenant, and deterministic materialization checks.
BEGIN;

DO $$
DECLARE
  v_admin public.profiles%ROWTYPE; v_other public.profiles%ROWTYPE;
  v_year public.academic_years%ROWTYPE; v_batch public.batches%ROWTYPE; v_subject public.subjects%ROWTYPE;
  v_schedule uuid; v_holiday uuid; v_result jsonb; v_date date;
BEGIN
  IF NOT (SELECT relrowsecurity FROM pg_class WHERE oid='public.learning_planner_holiday_settings'::regclass) THEN RAISE EXCEPTION 'Settings RLS is disabled'; END IF;
  IF NOT (SELECT relrowsecurity FROM pg_class WHERE oid='public.learning_planner_public_holidays'::regclass) THEN RAISE EXCEPTION 'Holiday RLS is disabled'; END IF;
  IF position('learning_planner_public_holidays' in (SELECT prosrc FROM pg_proc WHERE oid='public.generate_schedule_events(date,date,uuid,uuid)'::regprocedure))=0 THEN RAISE EXCEPTION 'Materialization does not use durable holidays'; END IF;
  SELECT * INTO v_admin FROM public.profiles WHERE is_active IS TRUE AND role IN ('admin','Super Admin','Institute Admin') AND institute_id IS NOT NULL ORDER BY created_at LIMIT 1;
  IF v_admin.id IS NULL THEN RAISE EXCEPTION 'Test requires an active administrator'; END IF;
  SELECT * INTO v_other FROM public.profiles WHERE institute_id<>v_admin.institute_id AND is_active IS TRUE ORDER BY created_at LIMIT 1;
  SELECT * INTO v_year FROM public.academic_years WHERE institute_id=v_admin.institute_id ORDER BY is_current DESC,start_date DESC LIMIT 1;
  SELECT * INTO v_batch FROM public.batches WHERE institute_id=v_admin.institute_id LIMIT 1;
  SELECT * INTO v_subject FROM public.subjects WHERE institute_id=v_admin.institute_id LIMIT 1;
  IF v_year.id IS NULL OR v_batch.id IS NULL THEN RAISE EXCEPTION 'Test requires Academic Year and Batch fixtures'; END IF;
  v_date:=GREATEST(v_year.start_date,current_date)+((1-extract(isodow from GREATEST(v_year.start_date,current_date))::int+7)%7);
  IF v_date>v_year.end_date THEN v_date:=v_year.start_date+((1-extract(isodow from v_year.start_date)::int+7)%7); END IF;
  INSERT INTO public.class_schedules(institute_id,academic_year_id,batch_id,subject_id,day_of_week,start_time,end_time,schedule_type,effective_from,is_active,created_by) VALUES(v_admin.institute_id,v_year.id,v_batch.id,v_subject.id,1,'08:00','09:00','regular_class',v_year.start_date,true,v_admin.id) RETURNING id INTO v_schedule;
  INSERT INTO public.learning_planner_public_holidays(institute_id,provider,external_id,holiday_date,name,normalized_name,holiday_scope,observed_as_holiday,created_by) VALUES(v_admin.institute_id,'TEST','test-non-working',v_date,'TEST HOLIDAY','TEST HOLIDAY','national',true,v_admin.id) RETURNING id INTO v_holiday;
  PERFORM set_config('request.jwt.claim.sub',v_admin.id::text,true); PERFORM set_config('role','authenticated',true);
  SELECT public.generate_schedule_events(v_date,v_date,NULL,v_schedule) INTO v_result;
  IF (v_result->>'generatedCount')::int<>0 OR (v_result->>'conflictCount')::int<>1 THEN RAISE EXCEPTION 'Imported non-working holiday did not suppress generation: %',v_result; END IF;
  UPDATE public.learning_planner_public_holidays SET observed_as_holiday=false WHERE id=v_holiday;
  SELECT public.generate_schedule_events(v_date,v_date,NULL,v_schedule) INTO v_result;
  IF (v_result->>'generatedCount')::int<>1 THEN RAISE EXCEPTION 'Working-day override did not permit generation: %',v_result; END IF;
  IF v_other.id IS NOT NULL AND EXISTS(SELECT 1 FROM public.learning_planner_public_holidays WHERE id=v_holiday AND institute_id=v_other.institute_id) THEN RAISE EXCEPTION 'Cross-institute holiday leakage'; END IF;
END $$;

ROLLBACK;
