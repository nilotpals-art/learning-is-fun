BEGIN;

DO $$
DECLARE
  v_admin public.profiles%ROWTYPE;
  v_year uuid;
  v_board uuid;
  v_class uuid;
  v_subject uuid;
  v_batch uuid;
  v_inactive_batch uuid;
  v_schedule uuid;
  v_event uuid;
  v_notification uuid;
  v_other_batch uuid;
  v_event_count integer;
BEGIN
  SELECT * INTO v_admin
  FROM public.profiles
  WHERE is_active IS TRUE
    AND role IN ('Administrator', 'Super Admin', 'admin', 'Institute Admin')
  ORDER BY CASE WHEN role = 'Super Admin' THEN 0 ELSE 1 END, created_at
  LIMIT 1;

  IF v_admin.id IS NULL THEN
    RAISE EXCEPTION 'Delete Batch test prerequisites are unavailable';
  END IF;

  SELECT id INTO v_year
  FROM public.academic_years
  WHERE institute_id = v_admin.institute_id AND is_active IS TRUE
  ORDER BY start_date DESC
  LIMIT 1;

  SELECT id INTO v_board FROM public.boards WHERE institute_id = v_admin.institute_id LIMIT 1;
  SELECT id INTO v_class FROM public.academic_classes WHERE institute_id = v_admin.institute_id LIMIT 1;
  SELECT id INTO v_subject FROM public.subjects WHERE institute_id = v_admin.institute_id LIMIT 1;

  IF v_year IS NULL OR v_board IS NULL OR v_class IS NULL OR v_subject IS NULL THEN
    RAISE EXCEPTION 'Delete Batch test academic data is unavailable';
  END IF;

  PERFORM set_config('request.jwt.claim.sub', v_admin.id::text, true);

  INSERT INTO public.batches(
    institute_id, academic_year_id, branch_id, board_id, class_id, subject_id, name, is_active
  ) VALUES (
    v_admin.institute_id, v_year, v_admin.branch_id, v_board, v_class, v_subject, 'SQL INACTIVE BATCH', false
  ) RETURNING id INTO v_inactive_batch;

  INSERT INTO public.class_schedules(
    institute_id, branch_id, academic_year_id, batch_id, subject_id, day_of_week,
    start_time, end_time, schedule_type, effective_from, is_active, created_by
  ) VALUES (
    v_admin.institute_id, v_admin.branch_id, v_year, v_inactive_batch, v_subject, 2,
    '08:00', '09:00', 'regular_class', current_date, false, v_admin.id
  ) RETURNING id INTO v_schedule;

  IF NOT EXISTS (SELECT 1 FROM public.class_schedules WHERE id = v_schedule AND batch_id = v_inactive_batch AND is_active IS FALSE) THEN
    RAISE EXCEPTION 'inactive Batch schedule was not preserved';
  END IF;

  UPDATE public.batches
  SET is_active = true
  WHERE id = v_inactive_batch;

  IF NOT EXISTS (SELECT 1 FROM public.class_schedules WHERE id = v_schedule AND batch_id = v_inactive_batch AND is_active IS FALSE) THEN
    RAISE EXCEPTION 'reactivated Batch should preserve existing schedule row';
  END IF;

  INSERT INTO public.batches(
    institute_id, academic_year_id, branch_id, board_id, class_id, subject_id, name, is_active
  ) VALUES (
    v_admin.institute_id, v_year, v_admin.branch_id, v_board, v_class, v_subject, 'SQL DELETE TEST BATCH', true
  ) RETURNING id INTO v_batch;

  INSERT INTO public.class_schedules(
    institute_id, branch_id, academic_year_id, batch_id, subject_id, day_of_week,
    start_time, end_time, schedule_type, effective_from, is_active, created_by
  ) VALUES (
    v_admin.institute_id, v_admin.branch_id, v_year, v_batch, v_subject, 3,
    '09:00', '10:00', 'regular_class', current_date, true, v_admin.id
  ) RETURNING id INTO v_schedule;

  INSERT INTO public.schedule_events(
    institute_id, branch_id, academic_year_id, batch_id, class_schedule_id, subject_id,
    event_date, start_time, end_time, schedule_type, status, title, notification_required, created_by
  ) VALUES (
    v_admin.institute_id, v_admin.branch_id, v_year, v_batch, v_schedule, v_subject,
    current_date + 2, '09:00', '10:00', 'extra_class', 'scheduled', 'SQL DELETE TEST EVENT', true, v_admin.id
  ) RETURNING id INTO v_event;

  INSERT INTO public.schedule_changes(
    schedule_event_id, change_type, old_date, old_start_time, old_end_time, new_date, new_start_time, new_end_time, reason, changed_by
  ) VALUES (
    v_event, 'created', current_date + 2, '09:00', '10:00', current_date + 2, '09:00', '10:00', 'TEST', v_admin.id
  );

  INSERT INTO public.notifications(
    institute_id, schedule_event_id, notification_type, title, message, priority, created_by
  ) VALUES (
    v_admin.institute_id, v_event, 'cancelled', 'SQL delete test', 'Delete batch test', 'important', v_admin.id
  ) RETURNING id INTO v_notification;

  INSERT INTO public.notification_recipients(
    institute_id, notification_id, user_id, recipient_role, delivery_channel
  ) VALUES (
    v_admin.institute_id, v_notification, v_admin.id, 'Student', 'in_app'
  );

  INSERT INTO public.planner_event_overlap_approvals(
    institute_id, branch_id, event_id, source_event_id, conflict_kind,
    conflicting_batch_id, conflicting_class_schedule_id, conflicting_event_id,
    event_date, proposed_start_time, proposed_end_time,
    conflicting_start_time, conflicting_end_time, reason, approved_by
  ) VALUES (
    v_admin.institute_id, v_admin.branch_id, v_event, NULL, 'exception_event',
    v_batch, NULL, v_event, current_date + 2, '09:00', '10:00', '09:00', '10:00', 'TEST', v_admin.id
  );

  INSERT INTO public.batch_schedule_overlap_approvals(
    institute_id, branch_id, proposed_batch_id, proposed_schedule_id,
    conflicting_batch_id, conflicting_schedule_id, day_of_week,
    existing_start_time, existing_end_time, proposed_start_time, proposed_end_time,
    reason, approved_by
  ) VALUES (
    v_admin.institute_id, v_admin.branch_id, v_batch, v_schedule,
    v_batch, v_schedule, 3, '09:00', '10:00', '09:00', '10:00', 'TEST', v_admin.id
  );

  INSERT INTO public.student_assignments(
    institute_id, student_id, academic_year_id, school_id, board_id, class_id, batch_id,
    effective_from, status, promotion_type, created_at, updated_at
  )
  SELECT v_admin.institute_id, s.id, v_year, s.school_id, v_board, v_class, v_batch,
         current_date, 'Current', 'New Admission', now(), now()
  FROM public.students s
  WHERE s.institute_id = v_admin.institute_id
  LIMIT 1;

  INSERT INTO public.batches(
    institute_id, academic_year_id, branch_id, board_id, class_id, subject_id, name, is_active
  ) VALUES (
    v_admin.institute_id, v_year, v_admin.branch_id, v_board, v_class, v_subject, 'SQL UNRELATED BATCH', true
  ) RETURNING id INTO v_other_batch;

  IF NOT public.delete_teaching_batch(v_batch) THEN
    RAISE EXCEPTION 'delete_teaching_batch returned false';
  END IF;

  IF EXISTS (SELECT 1 FROM public.batches WHERE id = v_batch) THEN
    RAISE EXCEPTION 'Batch row still exists after delete';
  END IF;

  IF EXISTS (SELECT 1 FROM public.class_schedules WHERE id = v_schedule) THEN
    RAISE EXCEPTION 'Class schedule row still exists after delete';
  END IF;

  IF EXISTS (SELECT 1 FROM public.schedule_events WHERE id = v_event) THEN
    RAISE EXCEPTION 'Schedule event row still exists after delete';
  END IF;

  IF EXISTS (SELECT 1 FROM public.schedule_changes WHERE schedule_event_id = v_event) THEN
    RAISE EXCEPTION 'Schedule change row still exists after delete';
  END IF;

  IF EXISTS (SELECT 1 FROM public.notifications WHERE id = v_notification) THEN
    RAISE EXCEPTION 'Notification row still exists after delete';
  END IF;

  IF EXISTS (SELECT 1 FROM public.planner_event_overlap_approvals WHERE event_id = v_event) THEN
    RAISE EXCEPTION 'Overlap approval row still exists after delete';
  END IF;

  IF EXISTS (SELECT 1 FROM public.batch_schedule_overlap_approvals WHERE proposed_batch_id = v_batch OR conflicting_batch_id = v_batch) THEN
    RAISE EXCEPTION 'Batch overlap audit row still exists after delete';
  END IF;

  IF EXISTS (SELECT 1 FROM public.student_assignments WHERE batch_id = v_batch) THEN
    RAISE EXCEPTION 'Student assignment row still exists after delete';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.batches WHERE id = v_other_batch) THEN
    RAISE EXCEPTION 'unrelated Batch was unexpectedly deleted';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.schedule_events e
    WHERE e.batch_id = v_batch
       OR e.class_schedule_id = v_schedule
  ) THEN
    RAISE EXCEPTION 'orphan Batch-event references remain';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.class_schedules cs
    WHERE cs.batch_id = v_batch
  ) THEN
    RAISE EXCEPTION 'orphan Batch schedule references remain';
  END IF;

  BEGIN
    PERFORM public.delete_teaching_batch(v_other_batch);
    RAISE EXCEPTION 'unauthorized delete unexpectedly succeeded';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM NOT LIKE '%BATCH_UNAUTHORIZED%' THEN
      RAISE;
    END IF;
  END;
END $$;

ROLLBACK;
