BEGIN;

DO $$ BEGIN
 IF NOT (SELECT relrowsecurity FROM pg_class WHERE oid='public.batches'::regclass) THEN RAISE EXCEPTION 'batches RLS must be enabled'; END IF;
 IF has_table_privilege('anon','public.batches','SELECT') OR has_table_privilege('anon','public.batches','INSERT') THEN RAISE EXCEPTION 'anonymous Batch access must be denied'; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='public.schedule_events'::regclass AND conname='schedule_events_type_check' AND pg_get_constraintdef(oid) LIKE '%extra_class%') THEN RAISE EXCEPTION 'extra_class constraint missing'; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_trigger WHERE tgrelid='public.class_schedules'::regclass AND tgname='class_schedules_prevent_internal_overlap') THEN RAISE EXCEPTION 'internal overlap trigger missing'; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='public.batch_schedule_overlap_approvals'::regclass AND conname='batch_overlap_reason_required') THEN RAISE EXCEPTION 'overlap audit reason constraint missing'; END IF;
END $$;

DO $$ BEGIN
 IF has_table_privilege('authenticated','public.class_schedules','INSERT')
    OR has_table_privilege('authenticated','public.class_schedules','UPDATE')
    OR has_table_privilege('authenticated','public.class_schedules','DELETE') THEN
   RAISE EXCEPTION 'authenticated must not have direct class_schedules write privileges';
 END IF;
 IF NOT has_table_privilege('authenticated','public.class_schedules','SELECT') THEN
   RAISE EXCEPTION 'authenticated requires class_schedules read access';
 END IF;
END $$;

SELECT set_config('request.jwt.claim.sub',(SELECT id::text FROM public.profiles WHERE is_active IS TRUE AND role IN('Super Admin','Administrator','admin','Institute Admin') ORDER BY CASE WHEN role='Super Admin' THEN 0 ELSE 1 END LIMIT 1),true);

DO $$
DECLARE v_profile public.profiles%ROWTYPE;v_year uuid;v_board uuid;v_class uuid;v_subject uuid;v_a jsonb;v_b jsonb;v_c jsonb;v_batch uuid;v_event jsonb;
BEGIN
 SELECT * INTO v_profile FROM public.profiles WHERE id=(SELECT auth.uid());
 SELECT id INTO v_year FROM public.academic_years WHERE institute_id=v_profile.institute_id AND is_current IS TRUE;
 SELECT id INTO v_board FROM public.boards WHERE institute_id=v_profile.institute_id LIMIT 1;
 SELECT id INTO v_class FROM public.academic_classes WHERE institute_id=v_profile.institute_id LIMIT 1;
 SELECT id INTO v_subject FROM public.subjects WHERE institute_id=v_profile.institute_id LIMIT 1;
 v_a:=public.create_teaching_batch(jsonb_build_object('academicYearId',v_year,'branchId','','boardId',v_board,'classId',v_class,'subjectId',v_subject,'name','SQL TIMETABLE A','effectiveFrom',current_date,'schedules',jsonb_build_array(jsonb_build_object('days',jsonb_build_array(2,5),'startTime','18:00','endTime','20:00'))),false);
 IF v_a->>'status'<>'success' OR jsonb_array_length(v_a->'scheduleIds')<>2 THEN RAISE EXCEPTION 'Tue/Fri creation failed'; END IF;
 v_batch:=(v_a->>'batchId')::uuid;
 BEGIN INSERT INTO public.class_schedules(institute_id,academic_year_id,batch_id,subject_id,day_of_week,start_time,end_time,schedule_type,effective_from,created_by) VALUES(v_profile.institute_id,v_year,v_batch,v_subject,2,'19:00','21:00','regular_class',current_date,v_profile.id);RAISE EXCEPTION 'internal overlap was allowed';EXCEPTION WHEN OTHERS THEN IF SQLERRM='internal overlap was allowed' THEN RAISE;END IF;END;
 v_b:=public.create_teaching_batch(jsonb_build_object('academicYearId',v_year,'branchId','','boardId',v_board,'classId',v_class,'subjectId',v_subject,'name','SQL TIMETABLE B','effectiveFrom',current_date,'schedules',jsonb_build_array(jsonb_build_object('days',jsonb_build_array(2),'startTime','20:00','endTime','21:00'))),false);
 IF v_b->>'status'<>'success' THEN RAISE EXCEPTION 'adjacent slot rejected';END IF;
 v_c:=public.create_teaching_batch(jsonb_build_object('academicYearId',v_year,'branchId','','boardId',v_board,'classId',v_class,'subjectId',v_subject,'name','SQL TIMETABLE C','effectiveFrom',current_date,'schedules',jsonb_build_array(jsonb_build_object('days',jsonb_build_array(2),'startTime','19:00','endTime','21:00'))),false);
 IF v_c->>'status'<>'conflict' THEN RAISE EXCEPTION 'external overlap not detected';END IF;
 v_c:=public.create_teaching_batch(jsonb_build_object('academicYearId',v_year,'branchId','','boardId',v_board,'classId',v_class,'subjectId',v_subject,'name','SQL TIMETABLE C','effectiveFrom',current_date,'overlapReason','SQL TEST APPROVED OVERLAP','schedules',jsonb_build_array(jsonb_build_object('days',jsonb_build_array(2),'startTime','19:00','endTime','21:00'))),true);
 IF v_c->>'status'<>'success' OR NOT EXISTS(SELECT 1 FROM public.batch_schedule_overlap_approvals WHERE proposed_batch_id=(v_c->>'batchId')::uuid) THEN RAISE EXCEPTION 'approved overlap audit failed';END IF;
 BEGIN
   PERFORM public.create_exceptional_planner_event(jsonb_build_object('scheduleType','regular_class','batchId',v_batch,'eventDate',current_date+10,'startTime','10:00','endTime','11:00','title','SQL REGULAR CLASS','notificationRequired',false),false,null);
   RAISE EXCEPTION 'Explicit routine Regular Class was accepted';
 EXCEPTION WHEN OTHERS THEN IF SQLERRM NOT LIKE '%PLANNER_REGULAR_CLASS_EXPLICIT_DISABLED%' THEN RAISE;END IF;END;
 v_event:=public.create_exceptional_planner_event(jsonb_build_object('scheduleType','extra_class','academicYearId',v_year,'batchId',v_batch,'eventDate',current_date+11,'startTime','10:00','endTime','11:00','title','SQL EXTRA CLASS','subjectId','','notificationRequired',false),false,null);
 IF v_event->>'status'<>'success' OR v_event->'event'->>'subject_id' IS NOT NULL THEN RAISE EXCEPTION 'extra class null subject rejected';END IF;
END $$;

ROLLBACK;
