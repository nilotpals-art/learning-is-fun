BEGIN;

DO $$
DECLARE
  v_admin public.profiles%ROWTYPE;
  v_student public.profiles%ROWTYPE;
  v_parent public.profiles%ROWTYPE;
  v_cross_admin public.profiles%ROWTYPE;
  v_year uuid;
  v_board uuid;
  v_class uuid;
  v_subject uuid;
  v_batch uuid;
  v_inactive_batch uuid;
  v_schedule uuid;
  v_event uuid;
  v_event_original uuid;
  v_event_related uuid;
  v_notification uuid;
  v_other_batch uuid;
  v_student_assignment uuid;
  v_student_batch uuid;
  v_practice_set uuid;
  v_practice_assignment uuid;
  v_practice_attempt uuid;
  v_exam_result_set_1 uuid;
  v_exam_result_set_2 uuid;
  v_exam_student_result uuid;
  v_attendance uuid;
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

  SELECT * INTO v_student
  FROM public.profiles
  WHERE institute_id = v_admin.institute_id
    AND is_active IS TRUE
    AND role = 'Student'
  LIMIT 1;

  SELECT * INTO v_parent
  FROM public.profiles
  WHERE institute_id = v_admin.institute_id
    AND is_active IS TRUE
    AND role = 'Parent'
  LIMIT 1;

  SELECT * INTO v_cross_admin
  FROM public.profiles
  WHERE institute_id <> v_admin.institute_id
    AND is_active IS TRUE
    AND role IN ('Administrator', 'Super Admin', 'admin', 'Institute Admin')
  LIMIT 1;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'batches'
      AND policyname = 'batches_admin_update'
  ) THEN
    RAISE EXCEPTION 'batches_admin_update policy is missing';
  END IF;

  IF v_student.id IS NOT NULL THEN
    PERFORM set_config('request.jwt.claim.sub', v_student.id::text, true);
    BEGIN
      UPDATE public.batches
      SET is_active = false
      WHERE id IN (SELECT id FROM public.batches WHERE institute_id = v_admin.institute_id LIMIT 1);
      RAISE EXCEPTION 'student Batch update unexpectedly succeeded';
    EXCEPTION WHEN OTHERS THEN
      IF SQLERRM NOT LIKE '%permission%' AND SQLERRM NOT LIKE '%new row violates%' AND SQLERRM NOT LIKE '%violates row-level security%' THEN
        RAISE;
      END IF;
    END;
  END IF;

  IF v_parent.id IS NOT NULL THEN
    PERFORM set_config('request.jwt.claim.sub', v_parent.id::text, true);
    BEGIN
      UPDATE public.batches
      SET is_active = false
      WHERE id IN (SELECT id FROM public.batches WHERE institute_id = v_admin.institute_id LIMIT 1);
      RAISE EXCEPTION 'parent Batch update unexpectedly succeeded';
    EXCEPTION WHEN OTHERS THEN
      IF SQLERRM NOT LIKE '%permission%' AND SQLERRM NOT LIKE '%new row violates%' AND SQLERRM NOT LIKE '%violates row-level security%' THEN
        RAISE;
      END IF;
    END;
  END IF;

  IF v_cross_admin.id IS NOT NULL THEN
    PERFORM set_config('request.jwt.claim.sub', v_cross_admin.id::text, true);
    BEGIN
      UPDATE public.batches
      SET is_active = false
      WHERE institute_id = v_admin.institute_id
        AND id IN (SELECT id FROM public.batches WHERE institute_id = v_admin.institute_id LIMIT 1);
      RAISE EXCEPTION 'cross-institute admin Batch update unexpectedly succeeded';
    EXCEPTION WHEN OTHERS THEN
      IF SQLERRM NOT LIKE '%permission%' AND SQLERRM NOT LIKE '%new row violates%' AND SQLERRM NOT LIKE '%violates row-level security%' THEN
        RAISE;
      END IF;
    END;
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

  -- create additional events that reference the primary event (original/related) to test self-reference cleanup
  INSERT INTO public.schedule_events(
    institute_id, branch_id, academic_year_id, batch_id, class_schedule_id, subject_id,
    event_date, start_time, end_time, schedule_type, status, title, notification_required, created_by, original_event_id
  ) VALUES (
    v_admin.institute_id, v_admin.branch_id, v_year, v_batch, v_schedule, v_subject,
    current_date + 3, '09:00', '10:00', 'extra_class', 'scheduled', 'SQL ORIGINAL REF', true, v_admin.id, v_event
  ) RETURNING id INTO v_event_original;

  INSERT INTO public.schedule_events(
    institute_id, branch_id, academic_year_id, batch_id, class_schedule_id, subject_id,
    event_date, start_time, end_time, schedule_type, status, title, notification_required, created_by, related_event_id
  ) VALUES (
    v_admin.institute_id, v_admin.branch_id, v_year, v_batch, v_schedule, v_subject,
    current_date + 4, '09:00', '10:00', 'extra_class', 'scheduled', 'SQL RELATED REF', true, v_admin.id, v_event
  ) RETURNING id INTO v_event_related;

  -- create a dedicated practice_set and assignment to verify attempts deletion
  INSERT INTO public.practice_sets(
    institute_id, academic_year_id, schedule_event_id, title, marks_mode, created_by
  ) VALUES (
    v_admin.institute_id, v_year, v_event, 'TEST PRACTICE SET', 'same_for_all', v_admin.id
  ) RETURNING id INTO v_practice_set;

  INSERT INTO public.practice_assignments(
    institute_id, assignment_group_id, practice_set_id, batch_id, student_id, schedule_event_id, available_from, due_at, status, created_by
  ) SELECT v_admin.institute_id, gen_random_uuid(), v_practice_set, v_batch, s.id, v_event, now(), now() + interval '1 day', 'assigned', v_admin.id
  FROM public.students s
  WHERE s.institute_id = v_admin.institute_id
  LIMIT 1
  RETURNING id INTO v_practice_assignment;

  INSERT INTO public.practice_attempts(
    institute_id, practice_assignment_id, student_id, attempt_no, started_at, submitted_at, status, score_obtained, max_marks
  ) VALUES (
    v_admin.institute_id, v_practice_assignment, (SELECT s.id FROM public.students s WHERE s.institute_id = v_admin.institute_id LIMIT 1), 1, now(), now() + interval '1 hour', 'submitted', 80, 100
  ) RETURNING id INTO v_practice_attempt;

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

  -- additional overlap approval referencing class_schedule and conflicting_event_id explicitly
  INSERT INTO public.planner_event_overlap_approvals(
    institute_id, branch_id, event_id, source_event_id, conflict_kind,
    conflicting_batch_id, conflicting_class_schedule_id, conflicting_event_id,
    event_date, proposed_start_time, proposed_end_time,
    conflicting_start_time, conflicting_end_time, reason, approved_by
  ) VALUES (
    v_admin.institute_id, v_admin.branch_id, v_event, NULL, 'exception_event',
    v_batch, v_schedule, v_event_original, current_date + 2, '09:00', '10:00', '09:00', '10:00', 'TEST', v_admin.id
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
  LIMIT 1
  RETURNING id INTO v_student_assignment;

  INSERT INTO public.student_batches(
    student_id, batch_id, academic_year_id, join_date, is_current, created_at
  )
  SELECT s.id, v_batch, v_year, current_date, true, now()
  FROM public.students s
  WHERE s.institute_id = v_admin.institute_id
  LIMIT 1
  RETURNING id INTO v_student_batch;

  -- create two exam result sets with supersedes relationship to test self-reference cleanup
  -- (only one 'draft' and one 'published' row is allowed per schedule_event; versions unique per event)
  INSERT INTO public.exam_result_sets(
    institute_id, schedule_event_id, academic_year_id, batch_id, subject_id, version_no, max_marks, status, published_at, published_by, created_by
  ) VALUES (
    v_admin.institute_id, v_event, v_year, v_batch, v_subject, 1, 100, 'published', now(), v_admin.id, v_admin.id
  ) RETURNING id INTO v_exam_result_set_1;

  INSERT INTO public.exam_result_sets(
    institute_id, schedule_event_id, academic_year_id, batch_id, subject_id, version_no, max_marks, status, created_by, supersedes_result_set_id
  ) VALUES (
    v_admin.institute_id, v_event, v_year, v_batch, v_subject, 2, 100, 'draft', v_admin.id, v_exam_result_set_1
  ) RETURNING id INTO v_exam_result_set_2;

  -- create a student result tied to one of the exam_result_sets and to the student_assignment
  INSERT INTO public.exam_student_results(
    institute_id, exam_result_set_id, student_id, student_assignment_id, marks_obtained
  ) SELECT v_admin.institute_id, v_exam_result_set_1, sa.student_id, sa.id, 90
  FROM public.student_assignments sa
  WHERE sa.institute_id = v_admin.institute_id AND sa.batch_id = v_batch
  LIMIT 1
  RETURNING id INTO v_exam_student_result;

  -- create a student attendance row tied to the student_assignment
  INSERT INTO public.student_attendance(
    institute_id, student_id, student_assignment_id, academic_year_id, batch_id,
    attendance_date, status, remarks, marked_by, created_at, updated_at
  ) SELECT v_admin.institute_id, sa.student_id, sa.id, v_year, v_batch,
         current_date, 'Present', NULL, v_admin.id, now(), now()
  FROM public.student_assignments sa
  WHERE sa.institute_id = v_admin.institute_id AND sa.batch_id = v_batch
  LIMIT 1
  RETURNING id INTO v_attendance;

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

  IF EXISTS (SELECT 1 FROM public.student_batches WHERE batch_id = v_batch) THEN
    RAISE EXCEPTION 'Student batch row still exists after delete';
  END IF;

  IF EXISTS (SELECT 1 FROM public.practice_assignments WHERE batch_id = v_batch) THEN
    RAISE EXCEPTION 'Practice assignment row still exists after delete';
  END IF;

  IF EXISTS (SELECT 1 FROM public.exam_result_sets WHERE batch_id = v_batch) THEN
    RAISE EXCEPTION 'Exam result set row still exists after delete';
  END IF;

  IF EXISTS (SELECT 1 FROM public.practice_sets WHERE id = v_practice_set) THEN
    RAISE EXCEPTION 'Practice set row still exists after delete';
  END IF;

  IF EXISTS (SELECT 1 FROM public.practice_attempts WHERE id = v_practice_attempt) THEN
    RAISE EXCEPTION 'Practice attempt row still exists after delete';
  END IF;

  IF EXISTS (SELECT 1 FROM public.exam_student_results WHERE id = v_exam_student_result) THEN
    RAISE EXCEPTION 'Exam student result row still exists after delete';
  END IF;

  IF EXISTS (SELECT 1 FROM public.student_attendance WHERE id = v_attendance) THEN
    RAISE EXCEPTION 'Student attendance row still exists after delete';
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

  -- ownership guard: a batch outside the caller's scope must raise BATCH_NOT_FOUND_OR_OUT_OF_SCOPE
  BEGIN
    PERFORM public.delete_teaching_batch(gen_random_uuid());
    RAISE EXCEPTION 'out-of-scope delete unexpectedly succeeded';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM NOT LIKE '%BATCH_NOT_FOUND_OR_OUT_OF_SCOPE%' THEN
      RAISE;
    END IF;
  END;
END $$;

-- Test: deletion blocked when an external exam_result_set supersedes a batch result set
DO $$
DECLARE
  a_admin public.profiles%ROWTYPE;
  a_year uuid;
  a_batch_a uuid;
  a_batch_b uuid;
  a_class_schedule uuid;
  a_event uuid;
  a_result_a uuid;
  a_result_b uuid;
BEGIN
  SELECT * INTO a_admin FROM public.profiles WHERE is_active IS TRUE AND role IN ('Administrator','Super Admin','admin','Institute Admin') LIMIT 1;
  IF a_admin.id IS NULL THEN
    RAISE EXCEPTION 'prereq missing';
  END IF;

  SELECT id INTO a_year FROM public.academic_years WHERE institute_id = a_admin.institute_id AND is_active IS TRUE LIMIT 1;
  IF a_year IS NULL THEN
    RAISE EXCEPTION 'no active academic year available';
  END IF;

  INSERT INTO public.batches(institute_id, academic_year_id, branch_id, board_id, class_id, subject_id, name, is_active)
  VALUES (a_admin.institute_id, a_year, a_admin.branch_id, (SELECT id FROM public.boards WHERE institute_id = a_admin.institute_id LIMIT 1), (SELECT id FROM public.academic_classes WHERE institute_id = a_admin.institute_id LIMIT 1), (SELECT id FROM public.subjects WHERE institute_id = a_admin.institute_id LIMIT 1), 'BATCH A', true)
  RETURNING id INTO a_batch_a;

  INSERT INTO public.batches(institute_id, academic_year_id, branch_id, board_id, class_id, subject_id, name, is_active)
  VALUES (a_admin.institute_id, a_year, a_admin.branch_id, (SELECT id FROM public.boards WHERE institute_id = a_admin.institute_id LIMIT 1), (SELECT id FROM public.academic_classes WHERE institute_id = a_admin.institute_id LIMIT 1), (SELECT id FROM public.subjects WHERE institute_id = a_admin.institute_id LIMIT 1), 'BATCH B', true)
  RETURNING id INTO a_batch_b;

  -- create a class schedule and a schedule event for batch A
  INSERT INTO public.class_schedules(institute_id, branch_id, academic_year_id, batch_id, subject_id, day_of_week, start_time, end_time, schedule_type, effective_from, is_active, created_by)
  VALUES (a_admin.institute_id, a_admin.branch_id, a_year, a_batch_a, (SELECT id FROM public.subjects WHERE institute_id = a_admin.institute_id LIMIT 1), 1, '08:00','09:00','regular_class', current_date, true, a_admin.id)
  RETURNING id INTO a_class_schedule;

  INSERT INTO public.schedule_events(institute_id, branch_id, academic_year_id, batch_id, class_schedule_id, subject_id, event_date, start_time, end_time, schedule_type, status, title, notification_required, created_by)
  VALUES (a_admin.institute_id, a_admin.branch_id, a_year, a_batch_a, a_class_schedule, (SELECT id FROM public.subjects WHERE institute_id = a_admin.institute_id LIMIT 1), current_date, '08:00','09:00','extra_class', 'scheduled', 'EVENT A', true, a_admin.id)
  RETURNING id INTO a_event;

  -- only one 'draft' is allowed per schedule_event; versions must be unique per event
  INSERT INTO public.exam_result_sets(institute_id, schedule_event_id, academic_year_id, batch_id, subject_id, version_no, max_marks, status, published_at, published_by, created_by)
  VALUES (a_admin.institute_id, a_event, a_year, a_batch_a, (SELECT id FROM public.subjects WHERE institute_id = a_admin.institute_id LIMIT 1), 1, 100, 'published', now(), a_admin.id, a_admin.id)
  RETURNING id INTO a_result_a;

  -- create a result set in Batch B that supersedes Batch A's result set
  INSERT INTO public.exam_result_sets(institute_id, schedule_event_id, academic_year_id, batch_id, subject_id, version_no, max_marks, status, created_by, supersedes_result_set_id)
  VALUES (a_admin.institute_id, a_event, a_year, a_batch_b, (SELECT id FROM public.subjects WHERE institute_id = a_admin.institute_id LIMIT 1), 2, 100, 'draft', a_admin.id, a_result_a)
  RETURNING id INTO a_result_b;

  -- run the delete as this block's admin so the ownership guard passes and the supersedes blocker triggers
  PERFORM set_config('request.jwt.claim.sub', a_admin.id::text, true);

  BEGIN
    PERFORM public.delete_teaching_batch(a_batch_a);
    RAISE EXCEPTION 'unexpectedly deleted batch A';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM NOT LIKE '%BATCH_DELETE_BLOCKED_BY_EXTERNAL_EXAM_SUPERSEDES%' THEN
      RAISE;
    END IF;
  END;

  -- ensure nothing from batch A was partially deleted (transaction rolled back)
  IF NOT EXISTS (SELECT 1 FROM public.batches WHERE id = a_batch_a) THEN
    RAISE EXCEPTION 'batch A was deleted despite supersedes blocker';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.exam_result_sets WHERE id = a_result_a) THEN
    RAISE EXCEPTION 'batch A exam_result_set missing after failed delete';
  END IF;
END $$;

ROLLBACK;
