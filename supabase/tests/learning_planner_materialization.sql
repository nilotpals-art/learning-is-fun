-- Transactional Module 06B verification. All generated test data is rolled back.
BEGIN;

DO $$
DECLARE
  v_admin public.profiles%ROWTYPE;
  v_year public.academic_years%ROWTYPE;
  v_batch public.batches%ROWTYPE;
  v_schedule_id uuid;
  v_inactive_schedule_id uuid;
  v_outside_schedule_id uuid;
  v_adjacent_schedule_id uuid;
  v_conflict_schedule_id uuid;
  v_manual_event_id uuid;
  v_first jsonb;
  v_second jsonb;
  v_check jsonb;
  v_event_id uuid;
  v_completed_event_id uuid;
  v_manual_created_at timestamptz;
BEGIN
  SELECT * INTO v_admin FROM public.profiles
  WHERE is_active IS TRUE AND role IN ('admin','Super Admin','Institute Admin')
  ORDER BY created_at LIMIT 1;
  IF v_admin.id IS NULL THEN RAISE EXCEPTION 'Test requires an active administrator'; END IF;

  SELECT * INTO v_year FROM public.academic_years
  WHERE institute_id=v_admin.institute_id AND start_date<='2026-08-10' AND end_date>='2026-08-23'
  ORDER BY is_current DESC LIMIT 1;
  SELECT * INTO v_batch FROM public.batches
  WHERE institute_id=v_admin.institute_id AND is_active IS TRUE LIMIT 1;
  IF v_year.id IS NULL OR v_batch.id IS NULL THEN RAISE EXCEPTION 'Test requires an Academic Year and active Batch'; END IF;

  INSERT INTO public.class_schedules(institute_id,branch_id,academic_year_id,batch_id,day_of_week,start_time,end_time,schedule_type,room,effective_from,effective_to,is_active,created_by)
  VALUES(v_admin.institute_id,v_admin.branch_id,v_year.id,v_batch.id,1,'06:01','06:31','regular_class','CODEX 06B TEST ROOM','2026-08-10','2026-08-23',true,v_admin.id)
  RETURNING id INTO v_schedule_id;

  PERFORM set_config('request.jwt.claim.sub',v_admin.id::text,true);
  SET LOCAL ROLE authenticated;

  v_first := public.generate_schedule_events('2026-08-10','2026-08-23',v_batch.id,v_schedule_id);
  IF (v_first->>'generatedCount')::integer <> 2 THEN RAISE EXCEPTION 'Expected two generated Mondays: %',v_first; END IF;
  IF (SELECT count(*) FROM public.schedule_events WHERE class_schedule_id=v_schedule_id AND original_event_id IS NULL) <> 2 THEN RAISE EXCEPTION 'Generated row count mismatch'; END IF;
  IF EXISTS(SELECT 1 FROM public.schedule_events WHERE class_schedule_id=v_schedule_id AND notification_required) THEN RAISE EXCEPTION 'Bulk generation must suppress routine notifications'; END IF;

  v_second := public.generate_schedule_events('2026-08-10','2026-08-23',v_batch.id,v_schedule_id);
  IF (v_second->>'generatedCount')::integer <> 0 OR (v_second->>'existingCount')::integer <> 2 THEN RAISE EXCEPTION 'Generation is not idempotent: %',v_second; END IF;

  SELECT id INTO v_event_id FROM public.schedule_events WHERE class_schedule_id=v_schedule_id ORDER BY event_date LIMIT 1;
  PERFORM public.cancel_schedule_event(v_event_id,'MODULE 06B TRANSACTIONAL TEST');
  SELECT id INTO v_completed_event_id FROM public.schedule_events WHERE class_schedule_id=v_schedule_id ORDER BY event_date DESC LIMIT 1;
  PERFORM public.complete_schedule_event(v_completed_event_id);
  v_second := public.generate_schedule_events('2026-08-10','2026-08-23',v_batch.id,v_schedule_id);
  IF (v_second->>'existingCount')::integer <> 2 THEN RAISE EXCEPTION 'Cancelled/completed occurrence was recreated'; END IF;
  IF (SELECT count(*) FROM public.schedule_events WHERE class_schedule_id=v_schedule_id AND original_event_id IS NULL) <> 2 THEN
    RAISE EXCEPTION 'Lifecycle-preserved occurrences were duplicated';
  END IF;

  -- Inactive schedules and schedules outside their effective window do not generate.
  INSERT INTO public.class_schedules(institute_id,branch_id,academic_year_id,batch_id,day_of_week,start_time,end_time,schedule_type,room,effective_from,effective_to,is_active,created_by)
  VALUES(v_admin.institute_id,v_admin.branch_id,v_year.id,v_batch.id,2,'06:01','06:31','regular_class','CODEX 06B INACTIVE','2026-08-10','2026-08-23',false,v_admin.id)
  RETURNING id INTO v_inactive_schedule_id;
  v_check := public.generate_schedule_events('2026-08-10','2026-08-23',v_batch.id,v_inactive_schedule_id);
  IF (v_check->>'generatedCount')::integer <> 0 OR (v_check->>'skippedInactiveCount')::integer <> 1 THEN
    RAISE EXCEPTION 'Inactive schedule was not skipped: %',v_check;
  END IF;

  INSERT INTO public.class_schedules(institute_id,branch_id,academic_year_id,batch_id,day_of_week,start_time,end_time,schedule_type,room,effective_from,effective_to,is_active,created_by)
  VALUES(v_admin.institute_id,v_admin.branch_id,v_year.id,v_batch.id,3,'06:01','06:31','regular_class','CODEX 06B OUTSIDE','2026-09-02','2026-09-09',true,v_admin.id)
  RETURNING id INTO v_outside_schedule_id;
  v_check := public.generate_schedule_events('2026-08-10','2026-08-23',v_batch.id,v_outside_schedule_id);
  IF (v_check->>'generatedCount')::integer <> 0 OR (v_check->>'skippedOutsideRangeCount')::integer <> 1 THEN
    RAISE EXCEPTION 'Effective-date exclusion failed: %',v_check;
  END IF;

  -- Academic-year bounds are part of the materialization intersection.
  UPDATE public.class_schedules
  SET effective_from=v_year.start_date-7, effective_to=v_year.start_date+7,
      day_of_week=extract(isodow FROM v_year.start_date)::smallint
  WHERE id=v_outside_schedule_id;
  v_check := public.generate_schedule_events(v_year.start_date-7,v_year.start_date+6,v_batch.id,v_outside_schedule_id);
  IF (v_check->>'generatedCount')::integer <> 1 THEN
    RAISE EXCEPTION 'Academic Year start boundary was not respected: %',v_check;
  END IF;

  -- A manual event is never touched by recurring materialization.
  INSERT INTO public.schedule_events(institute_id,branch_id,academic_year_id,batch_id,event_date,start_time,end_time,schedule_type,status,title,room,notification_required,created_by)
  VALUES(v_admin.institute_id,v_admin.branch_id,v_year.id,NULL,'2026-08-16',NULL,NULL,'holiday','scheduled','CODEX 06B MANUAL EVENT',NULL,false,v_admin.id)
  RETURNING id,created_at INTO v_manual_event_id,v_manual_created_at;
  PERFORM public.generate_schedule_events('2026-08-10','2026-08-23',v_batch.id,v_schedule_id);
  IF NOT EXISTS(SELECT 1 FROM public.schedule_events WHERE id=v_manual_event_id AND class_schedule_id IS NULL AND created_at=v_manual_created_at) THEN
    RAISE EXCEPTION 'Manual event was modified or removed';
  END IF;

  -- Adjacent events are allowed because exact overlap uses strict inequalities.
  INSERT INTO public.schedule_events(institute_id,branch_id,academic_year_id,batch_id,event_date,start_time,end_time,schedule_type,status,title,room,notification_required,created_by)
  VALUES(v_admin.institute_id,v_admin.branch_id,v_year.id,v_batch.id,'2026-08-18','06:31','07:00','regular_class','scheduled','CODEX 06B ADJACENT EVENT',NULL,false,v_admin.id);
  INSERT INTO public.class_schedules(institute_id,branch_id,academic_year_id,batch_id,day_of_week,start_time,end_time,schedule_type,room,effective_from,effective_to,is_active,created_by)
  VALUES(v_admin.institute_id,v_admin.branch_id,v_year.id,v_batch.id,2,'06:01','06:31','regular_class',NULL,'2026-08-18','2026-08-18',true,v_admin.id)
  RETURNING id INTO v_adjacent_schedule_id;
  v_check := public.generate_schedule_events('2026-08-18','2026-08-18',v_batch.id,v_adjacent_schedule_id);
  IF (v_check->>'generatedCount')::integer <> 1 THEN RAISE EXCEPTION 'Adjacent event was incorrectly treated as a conflict: %',v_check; END IF;

  -- A same-batch overlap is skipped and reported.
  INSERT INTO public.class_schedules(institute_id,branch_id,academic_year_id,batch_id,day_of_week,start_time,end_time,schedule_type,room,effective_from,effective_to,is_active,created_by)
  VALUES(v_admin.institute_id,v_admin.branch_id,v_year.id,v_batch.id,2,'06:15','06:45','regular_class',NULL,'2026-08-18','2026-08-18',true,v_admin.id)
  RETURNING id INTO v_conflict_schedule_id;
  v_check := public.generate_schedule_events('2026-08-18','2026-08-18',v_batch.id,v_conflict_schedule_id);
  IF (v_check->>'generatedCount')::integer <> 0 OR (v_check->>'conflictCount')::integer <> 1 OR v_check->'conflicts'->0->>'type' <> 'batch' THEN
    RAISE EXCEPTION 'Batch conflict was not skipped/reported: %',v_check;
  END IF;

  -- Rescheduled originals remain the deterministic occurrence marker.
  UPDATE public.schedule_events SET status='rescheduled'
  WHERE class_schedule_id=v_adjacent_schedule_id AND original_event_id IS NULL;
  v_check := public.generate_schedule_events('2026-08-18','2026-08-18',v_batch.id,v_adjacent_schedule_id);
  IF (v_check->>'generatedCount')::integer <> 0 OR (v_check->>'existingCount')::integer <> 1 THEN
    RAISE EXCEPTION 'Rescheduled original occurrence was recreated: %',v_check;
  END IF;

  -- An institute/branch-scoped all-day holiday suppresses generation.
  UPDATE public.schedule_events SET event_date='2026-08-23' WHERE id=v_manual_event_id;
  UPDATE public.class_schedules
  SET day_of_week=7, effective_from='2026-08-23', effective_to='2026-08-23', start_time='08:00', end_time='09:00'
  WHERE id=v_conflict_schedule_id;
  v_check := public.generate_schedule_events('2026-08-23','2026-08-23',v_batch.id,v_conflict_schedule_id);
  IF (v_check->>'generatedCount')::integer <> 0 OR v_check->'conflicts'->0->>'type' <> 'holiday' THEN
    RAISE EXCEPTION 'All-day holiday did not suppress generation: %',v_check;
  END IF;

  -- A same-room overlap in another Batch is skipped when a second Batch exists.
  DECLARE
    v_other_batch_id uuid;
    v_room_schedule_id uuid;
  BEGIN
    SELECT id INTO v_other_batch_id FROM public.batches
    WHERE institute_id=v_admin.institute_id AND id<>v_batch.id AND is_active IS TRUE LIMIT 1;
    IF v_other_batch_id IS NOT NULL THEN
      INSERT INTO public.schedule_events(institute_id,branch_id,academic_year_id,batch_id,event_date,start_time,end_time,schedule_type,status,title,room,notification_required,created_by)
      VALUES(v_admin.institute_id,v_admin.branch_id,v_year.id,v_batch.id,'2026-08-20','10:00','11:00','regular_class','scheduled','CODEX 06B ROOM BLOCKER','CODEX 06B SHARED ROOM',false,v_admin.id);
      INSERT INTO public.class_schedules(institute_id,branch_id,academic_year_id,batch_id,day_of_week,start_time,end_time,schedule_type,room,effective_from,effective_to,is_active,created_by)
      VALUES(v_admin.institute_id,v_admin.branch_id,v_year.id,v_other_batch_id,4,'10:15','10:45','regular_class',' codex 06b shared room ','2026-08-20','2026-08-20',true,v_admin.id)
      RETURNING id INTO v_room_schedule_id;
      v_check := public.generate_schedule_events('2026-08-20','2026-08-20',v_other_batch_id,v_room_schedule_id);
      IF (v_check->>'generatedCount')::integer <> 0 OR v_check->'conflicts'->0->>'type' <> 'room' THEN
        RAISE EXCEPTION 'Normalized room conflict was not skipped/reported: %',v_check;
      END IF;
    END IF;
  END;

  -- A Batch owned by another Institute cannot be used as a generation filter.
  RESET ROLE;
  DECLARE
    v_foreign_institute_id uuid;
    v_foreign_batch_id uuid;
  BEGIN
    INSERT INTO public.institutes(name) VALUES('CODEX 06B FOREIGN INSTITUTE') RETURNING id INTO v_foreign_institute_id;
    INSERT INTO public.batches(institute_id,name,is_active)
    VALUES(v_foreign_institute_id,'CODEX 06B FOREIGN BATCH',true) RETURNING id INTO v_foreign_batch_id;
    PERFORM set_config('request.jwt.claim.sub',v_admin.id::text,true);
    SET LOCAL ROLE authenticated;
    BEGIN
      PERFORM public.generate_schedule_events('2026-08-10','2026-08-10',v_foreign_batch_id,NULL);
      RAISE EXCEPTION 'Cross-Institute Batch filter was accepted';
    EXCEPTION WHEN OTHERS THEN
      IF SQLERRM NOT LIKE '%PLANNER_BATCH_INVALID%' THEN RAISE; END IF;
    END;
  END;

  -- A branch-scoped administrator materializes only the matching branch.
  RESET ROLE;
  DECLARE
    v_allowed_branch_id uuid;
    v_other_branch_id uuid;
    v_allowed_schedule_id uuid;
    v_other_schedule_id uuid;
  BEGIN
    INSERT INTO public.branches(institute_id,name,is_active)
    VALUES(v_admin.institute_id,'CODEX 06B ALLOWED BRANCH',true) RETURNING id INTO v_allowed_branch_id;
    INSERT INTO public.branches(institute_id,name,is_active)
    VALUES(v_admin.institute_id,'CODEX 06B OTHER BRANCH',true) RETURNING id INTO v_other_branch_id;
    UPDATE public.profiles SET branch_id=v_allowed_branch_id WHERE id=v_admin.id;

    INSERT INTO public.class_schedules(institute_id,branch_id,academic_year_id,batch_id,day_of_week,start_time,end_time,schedule_type,effective_from,effective_to,is_active,created_by)
    VALUES(v_admin.institute_id,v_allowed_branch_id,v_year.id,v_batch.id,5,'12:00','12:30','regular_class','2026-08-21','2026-08-21',true,v_admin.id)
    RETURNING id INTO v_allowed_schedule_id;
    INSERT INTO public.class_schedules(institute_id,branch_id,academic_year_id,batch_id,day_of_week,start_time,end_time,schedule_type,effective_from,effective_to,is_active,created_by)
    VALUES(v_admin.institute_id,v_other_branch_id,v_year.id,v_batch.id,5,'13:00','13:30','regular_class','2026-08-21','2026-08-21',true,v_admin.id)
    RETURNING id INTO v_other_schedule_id;

    PERFORM set_config('request.jwt.claim.sub',v_admin.id::text,true);
    SET LOCAL ROLE authenticated;
    v_check := public.generate_schedule_events('2026-08-21','2026-08-21',NULL,NULL);
    IF NOT EXISTS(SELECT 1 FROM public.schedule_events WHERE class_schedule_id=v_allowed_schedule_id)
       OR EXISTS(SELECT 1 FROM public.schedule_events WHERE class_schedule_id=v_other_schedule_id) THEN
      RAISE EXCEPTION 'Branch-scoped generation crossed the administrator branch boundary: %',v_check;
    END IF;
  END;

  IF (SELECT count(*) FROM public.schedule_changes sc JOIN public.schedule_events e ON e.id=sc.schedule_event_id WHERE e.class_schedule_id=v_schedule_id AND sc.change_type='created') <> 2 THEN RAISE EXCEPTION 'Created audits missing'; END IF;

  BEGIN
    PERFORM public.generate_schedule_events('2026-01-01','2026-04-30',NULL,NULL);
    RAISE EXCEPTION 'Range limit was not enforced';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM NOT LIKE '%PLANNER_GENERATION_RANGE_TOO_LARGE%' THEN RAISE; END IF;
  END;

  DECLARE v_student_id uuid;
  BEGIN
    SELECT id INTO v_student_id FROM public.profiles WHERE is_active IS TRUE AND role='Student' LIMIT 1;
    IF v_student_id IS NOT NULL THEN
      PERFORM set_config('request.jwt.claim.sub',v_student_id::text,true);
      BEGIN
        PERFORM public.generate_schedule_events('2026-08-10','2026-08-10',NULL,NULL);
        RAISE EXCEPTION 'Student generation was not denied';
      EXCEPTION WHEN OTHERS THEN
        IF SQLERRM NOT LIKE '%PLANNER_UNAUTHORIZED%' THEN RAISE; END IF;
      END;
    END IF;
  END;

  DECLARE v_parent_id uuid;
  BEGIN
    SELECT id INTO v_parent_id FROM public.profiles WHERE is_active IS TRUE AND role='Parent' LIMIT 1;
    IF v_parent_id IS NOT NULL THEN
      PERFORM set_config('request.jwt.claim.sub',v_parent_id::text,true);
      BEGIN
        PERFORM public.generate_schedule_events('2026-08-10','2026-08-10',NULL,NULL);
        RAISE EXCEPTION 'Parent generation was not denied';
      EXCEPTION WHEN OTHERS THEN
        IF SQLERRM NOT LIKE '%PLANNER_UNAUTHORIZED%' THEN RAISE; END IF;
      END;
    END IF;
  END;
END $$;

ROLLBACK;
