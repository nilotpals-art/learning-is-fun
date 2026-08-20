BEGIN;

-- =====================================================================
-- Rollover Continuation integrity test
-- Verifies: tables/policies, workspace generation, parent response flow,
-- capacity locking, admin override, finalization, breaks, attendance hook.
-- Runs inside a transaction and rolls back (no data retained).
-- =====================================================================

DO $$
DECLARE
  v_admin public.profiles%ROWTYPE;
  v_parent public.profiles%ROWTYPE;
  v_student_id uuid;
  v_source_year uuid;
  v_source_start date;
  v_target_year uuid;
  v_target_start date;
  v_board uuid;
  v_class uuid;
  v_subject uuid;
  v_school uuid;
  v_source_batch uuid;
  v_source_assignment public.student_assignments%ROWTYPE;
  v_batch_cap1 uuid;
  v_batch_cap2 uuid;
  v_unlimited_batch uuid;
  v_request uuid;
  v_request_b uuid;
  v_result jsonb;
  v_detail jsonb;
  v_batches jsonb;
  v_seats integer;
  v_count integer;
  v_break_id uuid;
  v_other_parent public.profiles%ROWTYPE;
BEGIN
  -- ---------- Preconditions ----------
  SELECT * INTO v_admin
  FROM public.profiles
  WHERE is_active IS TRUE
    AND role IN ('Administrator', 'Super Admin', 'admin', 'Institute Admin')
  ORDER BY CASE WHEN role = 'Super Admin' THEN 0 ELSE 1 END, created_at
  LIMIT 1;

  IF v_admin.id IS NULL THEN
    RAISE EXCEPTION 'Rollover test admin prerequisite is unavailable';
  END IF;

  PERFORM set_config('request.jwt.claim.sub', v_admin.id::text, true);

  -- A parent profile within the same institute (any; link established below).
  SELECT * INTO v_parent
  FROM public.profiles
  WHERE institute_id = v_admin.institute_id
    AND is_active IS TRUE
    AND role = 'Parent'
  LIMIT 1;

  IF v_parent.id IS NULL THEN
    RAISE EXCEPTION 'Rollover test parent prerequisite is unavailable';
  END IF;

  SELECT * INTO v_other_parent
  FROM public.profiles
  WHERE institute_id <> v_admin.institute_id
    AND is_active IS TRUE
    AND role = 'Parent'
  LIMIT 1;

  -- Resolve the subject (created when the institute has none).
  SELECT id INTO v_subject FROM public.subjects WHERE institute_id = v_admin.institute_id LIMIT 1;
  IF v_subject IS NULL THEN
    INSERT INTO public.subjects (institute_id, subject_name)
    VALUES (v_admin.institute_id, 'ROLLOVER TEST SUBJECT')
    RETURNING id INTO v_subject;
  END IF;

  -- A current source-year assignment for an active student; create a
  -- disposable one inside this transaction when none exists.
  SELECT sa.* INTO v_source_assignment
  FROM public.student_assignments sa
  JOIN public.students s ON s.id = sa.student_id AND s.institute_id = sa.institute_id
  JOIN public.academic_years ay ON ay.id = sa.academic_year_id AND ay.institute_id = sa.institute_id
  WHERE sa.institute_id = v_admin.institute_id
    AND sa.status = 'Current'
    AND sa.effective_to IS NULL
    AND s.status = 'Active'
  ORDER BY ay.start_date DESC
  LIMIT 1;

  IF v_source_assignment.id IS NULL THEN
    -- Build a disposable fixture chain (student, year, school, board, class,
    -- batch, assignment) that is fully rolled back with this transaction.
    SELECT ay.id, ay.start_date INTO v_source_year, v_source_start
    FROM public.academic_years ay
    WHERE ay.institute_id = v_admin.institute_id
      AND ay.is_active IS TRUE
    ORDER BY ay.start_date DESC
    LIMIT 1;

    IF v_source_year IS NULL THEN
      v_source_start := current_date;
      INSERT INTO public.academic_years (
        institute_id, name, start_date, end_date, is_current, is_active
      ) VALUES (
        v_admin.institute_id, 'ROLLOVER SOURCE YEAR',
        v_source_start, v_source_start + interval '1 year' - interval '1 day',
        false, true
      )
      RETURNING id INTO v_source_year;
    END IF;

    INSERT INTO public.students (
      institute_id, admission_no, gender, date_of_birth, mobile, email,
      name, admission_date, status
    ) VALUES (
      v_admin.institute_id,
      'ROLLOVER-TEST-' || to_char(clock_timestamp(), 'YYYYMMDDHH24MISSMS'),
      'Male', '2010-01-01', '9000000001', 'rollover-test@example.invalid',
      'ROLLOVER TEST STUDENT', v_source_start, 'Active'
    )
    RETURNING id INTO v_student_id;

    SELECT id INTO v_school FROM public.schools
    WHERE institute_id = v_admin.institute_id AND is_active IS TRUE
    ORDER BY name LIMIT 1;
    IF v_school IS NULL THEN
      INSERT INTO public.schools (institute_id, name, is_active)
      VALUES (v_admin.institute_id, 'ROLLOVER TEST SCHOOL', true)
      RETURNING id INTO v_school;
    END IF;

    SELECT id INTO v_board FROM public.boards
    WHERE institute_id = v_admin.institute_id
    ORDER BY name LIMIT 1;
    IF v_board IS NULL THEN
      INSERT INTO public.boards (institute_id, name)
      VALUES (v_admin.institute_id, 'ROLLOVER TEST BOARD')
      RETURNING id INTO v_board;
    END IF;

    SELECT id INTO v_class FROM public.academic_classes
    WHERE institute_id = v_admin.institute_id
    ORDER BY display_order LIMIT 1;
    IF v_class IS NULL THEN
      INSERT INTO public.academic_classes (institute_id, class_name, display_order)
      VALUES (v_admin.institute_id, 'ROLLOVER TEST CLASS', 9999)
      RETURNING id INTO v_class;
    END IF;

    SELECT id INTO v_source_batch FROM public.batches
    WHERE institute_id = v_admin.institute_id
      AND academic_year_id = v_source_year
      AND board_id = v_board
      AND class_id = v_class
      AND subject_id = v_subject
      AND is_active IS TRUE
    LIMIT 1;
    IF v_source_batch IS NULL THEN
      INSERT INTO public.batches (
        institute_id, academic_year_id, branch_id, board_id, class_id, subject_id,
        name, is_active
      ) VALUES (
        v_admin.institute_id, v_source_year, v_admin.branch_id,
        v_board, v_class, v_subject, 'ROLLOVER SOURCE BATCH', true
      )
      RETURNING id INTO v_source_batch;
    END IF;

    INSERT INTO public.student_assignments (
      institute_id, student_id, academic_year_id, school_id, board_id, class_id,
      batch_id, effective_from, status, promotion_type
    ) VALUES (
      v_admin.institute_id, v_student_id, v_source_year, v_school, v_board, v_class,
      v_source_batch, v_source_start, 'Current', 'New Admission'
    )
    RETURNING id INTO v_source_assignment.id;

    v_source_assignment.student_id := v_student_id;
    v_source_assignment.academic_year_id := v_source_year;
    v_source_assignment.board_id := v_board;
    v_source_assignment.class_id := v_class;
    v_source_assignment.school_id := v_school;
  END IF;

  v_student_id := v_source_assignment.student_id;
  v_source_year := v_source_assignment.academic_year_id;
  v_board := v_source_assignment.board_id;
  v_class := v_source_assignment.class_id;
  v_school := v_source_assignment.school_id;

  SELECT start_date INTO v_source_start
  FROM public.academic_years ay
  WHERE ay.id = v_source_year;

  -- Target year: prefer a later active year, otherwise create one.
  SELECT ay.id, ay.start_date INTO v_target_year, v_target_start
  FROM public.academic_years ay
  WHERE ay.institute_id = v_admin.institute_id
    AND ay.is_active IS TRUE
    AND ay.start_date > v_source_start
  ORDER BY ay.start_date ASC
  LIMIT 1;

  IF v_target_year IS NULL THEN
    v_target_start := v_source_start + interval '1 year';
    INSERT INTO public.academic_years (
      institute_id, name, start_date, end_date, is_active, is_current
    ) VALUES (
      v_admin.institute_id,
      'ROLLOVER TEST YEAR',
      v_target_start,
      v_target_start + interval '1 year' - interval '1 day',
      true,
      false
    )
    RETURNING id INTO v_target_year;
  END IF;

  -- ---------- Schema checks ----------
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'academic_years'
      AND column_name = 'continuation_response_deadline'
  ) THEN
    RAISE EXCEPTION 'academic_years.continuation_response_deadline is missing';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'batches'
      AND column_name = 'capacity'
  ) THEN
    RAISE EXCEPTION 'batches.capacity is missing';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public'
      AND tablename = 'student_rollover_requests' AND policyname = 'rollover_requests_admin_select'
  ) OR NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public'
      AND tablename = 'student_rollover_requests' AND policyname = 'rollover_requests_parent_select'
  ) THEN
    RAISE EXCEPTION 'student_rollover_requests RLS policies are missing';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'student_enrollment_breaks'
  ) OR NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'student_rollover_batch_change_history'
  ) THEN
    RAISE EXCEPTION 'rollover support tables are missing';
  END IF;

  -- Capacity check constraint must reject zero.
  BEGIN
    INSERT INTO public.batches(
      institute_id, academic_year_id, branch_id, board_id, class_id, subject_id, name, is_active, capacity
    ) VALUES (
      v_admin.institute_id, v_target_year, v_admin.branch_id, v_board, v_class, v_subject,
      'INVALID CAPACITY BATCH', true, 0
    );
    RAISE EXCEPTION 'capacity=0 unexpectedly accepted';
  EXCEPTION WHEN check_violation THEN
    NULL;
  END;

  -- ---------- Workspace generation ----------
  v_result := public.generate_rollover_workspace(v_source_year, v_target_year);
  IF (v_result->>'created')::integer < 1 THEN
    RAISE EXCEPTION 'generate_rollover_workspace created no requests';
  END IF;

  SELECT count(*) INTO v_count
  FROM public.student_rollover_requests
  WHERE institute_id = v_admin.institute_id
    AND source_academic_year_id = v_source_year
    AND target_academic_year_id = v_target_year;

  IF v_count < 1 THEN
    RAISE EXCEPTION 'rollover requests were not persisted';
  END IF;

  v_result := public.generate_rollover_workspace(v_source_year, v_target_year);
  IF (v_result->>'skipped_existing')::integer < 1 THEN
    RAISE EXCEPTION 'generate_rollover_workspace should skip existing requests';
  END IF;

  SELECT id INTO v_request
  FROM public.student_rollover_requests
  WHERE institute_id = v_admin.institute_id
    AND student_id = v_student_id
    AND source_academic_year_id = v_source_year
    AND target_academic_year_id = v_target_year
  LIMIT 1;

  IF v_request IS NULL THEN
    RAISE EXCEPTION 'expected rollover request for the source student is missing';
  END IF;

  -- Unauthorized generation for a parent.
  PERFORM set_config('request.jwt.claim.sub', v_parent.id::text, true);
  BEGIN
    PERFORM public.generate_rollover_workspace(v_source_year, v_target_year);
    RAISE EXCEPTION 'parent workspace generation unexpectedly succeeded';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM NOT LIKE '%ROLLOVER_UNAUTHORIZED%' THEN
      RAISE;
    END IF;
  END;

  -- Parent RLS: direct UPDATE on the request must fail.
  BEGIN
    UPDATE public.student_rollover_requests
    SET parent_response = 'continuing'
    WHERE id = v_request;
    RAISE EXCEPTION 'parent direct UPDATE unexpectedly succeeded';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM NOT LIKE '%permission%' AND SQLERRM NOT LIKE '%violates row-level security%' THEN
      RAISE;
    END IF;
  END;

  -- Non-linked parent cannot access another parent''s child request.
  IF v_other_parent.id IS NOT NULL THEN
    PERFORM set_config('request.jwt.claim.sub', v_other_parent.id::text, true);
    BEGIN
      PERFORM public.get_rollover_request_detail(v_request);
      RAISE EXCEPTION 'cross-institute parent detail access unexpectedly succeeded';
    EXCEPTION WHEN OTHERS THEN
      IF SQLERRM NOT LIKE '%ROLLOVER_UNAUTHORIZED%' THEN
        RAISE;
      END IF;
    END;
  END IF;

  -- ---------- Parent response flow ----------
  -- Establish the parent link for the student if missing.
  INSERT INTO public.student_parent_links (institute_id, student_id, parent_id, relationship)
  SELECT v_admin.institute_id, v_student_id, p.id, 'Father'
  FROM public.parents p
  WHERE p.institute_id = v_admin.institute_id
    AND p.profile_id = v_parent.id
  ON CONFLICT DO NOTHING;

  IF NOT EXISTS (
    SELECT 1 FROM public.parents p
    JOIN public.student_parent_links spl ON spl.parent_id = p.id
    WHERE p.profile_id = v_parent.id
      AND spl.student_id = v_student_id
  ) THEN
    RAISE EXCEPTION 'unable to link parent to the source student';
  END IF;

  PERFORM set_config('request.jwt.claim.sub', v_parent.id::text, true);

  -- Eligible batches: create two capacity=1 batches and one unlimited batch.
  INSERT INTO public.batches(
    institute_id, academic_year_id, branch_id, board_id, class_id, subject_id, name, is_active, capacity
  ) VALUES (
    v_admin.institute_id, v_target_year, v_admin.branch_id, v_board, v_class, v_subject,
    'ROLLOVER CAP1 A', true, 1
  ) RETURNING id INTO v_batch_cap1;

  INSERT INTO public.batches(
    institute_id, academic_year_id, branch_id, board_id, class_id, subject_id, name, is_active, capacity
  ) VALUES (
    v_admin.institute_id, v_target_year, v_admin.branch_id, v_board, v_class, v_subject,
    'ROLLOVER CAP1 B', true, 1
  ) RETURNING id INTO v_batch_cap2;

  INSERT INTO public.batches(
    institute_id, academic_year_id, branch_id, board_id, class_id, subject_id, name, is_active, capacity
  ) VALUES (
    v_admin.institute_id, v_target_year, v_admin.branch_id, v_board, v_class, v_subject,
    'ROLLOVER UNLIMITED', true, NULL
  ) RETURNING id INTO v_unlimited_batch;

  -- Parent must be able to list eligible batches through the RLS-safe RPC.
  v_batches := public.list_rollover_eligible_batches(v_request);
  IF jsonb_array_length(v_batches) < 3 THEN
    RAISE EXCEPTION 'eligible batches list is incomplete for parent';
  END IF;

  -- Unlimited batch reports NULL seats.
  SELECT public.rollover_seat_availability(v_unlimited_batch, v_target_year, v_request)
  INTO v_seats;
  IF v_seats IS NOT NULL THEN
    RAISE EXCEPTION 'unlimited batch should report NULL availability';
  END IF;

  -- Save a delayed-joining response with a batch choice.
  v_result := public.save_parent_rollover_response(
    v_request, 'continuing', 'delayed', v_target_start + 10, v_batch_cap1, 'TRAVEL'
  );
  IF (v_result->>'status') IS DISTINCT FROM 'saved' THEN
    RAISE EXCEPTION 'parent response was not saved';
  END IF;

  -- Invalid response: not_continuing cannot carry a batch.
  BEGIN
    PERFORM public.save_parent_rollover_response(
      v_request, 'not_continuing', NULL, NULL, v_batch_cap1, NULL
    );
    RAISE EXCEPTION 'not_continuing with batch unexpectedly accepted';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM NOT LIKE '%ROLLOVER_RESPONSE_INVALID%' THEN
      RAISE;
    END IF;
  END;

  -- Confirm (lock) the choice.
  v_result := public.confirm_parent_rollover(v_request);
  IF (v_result->>'locked') IS DISTINCT FROM 'true' THEN
    RAISE EXCEPTION 'parent confirmation did not lock the request';
  END IF;

  -- Double confirmation must be rejected.
  BEGIN
    PERFORM public.confirm_parent_rollover(v_request);
    RAISE EXCEPTION 'double confirmation unexpectedly succeeded';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM NOT LIKE '%ROLLOVER_ALREADY_CONFIRMED%' THEN
      RAISE;
    END IF;
  END;

  -- Saving after lock must be rejected.
  BEGIN
    PERFORM public.save_parent_rollover_response(
      v_request, 'continuing', 'normal', NULL, v_batch_cap1, 'CHANGE'
    );
    RAISE EXCEPTION 'post-lock save unexpectedly succeeded';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM NOT LIKE '%ROLLOVER_RESPONSE_LOCKED%' THEN
      RAISE;
    END IF;
  END;

  -- ---------- Capacity concurrency ----------
  -- Second student must be refused the only remaining seat in batch A.
  SELECT rr.id INTO v_request_b
  FROM public.student_rollover_requests rr
  WHERE rr.institute_id = v_admin.institute_id
    AND rr.id <> v_request
    AND rr.source_academic_year_id = v_source_year
    AND rr.target_academic_year_id = v_target_year
  ORDER BY rr.student_id
  LIMIT 1;

  IF v_request_b IS NOT NULL THEN
    PERFORM public.save_parent_rollover_response(
      v_request_b, 'continuing', 'normal', NULL, v_batch_cap1, NULL
    );
    BEGIN
      PERFORM public.confirm_parent_rollover(v_request_b);
      RAISE EXCEPTION 'over-capacity confirmation unexpectedly succeeded';
    EXCEPTION WHEN OTHERS THEN
      IF SQLERRM NOT LIKE '%ROLLOVER_BATCH_FULL%' THEN
        RAISE;
      END IF;
    END;
  END IF;

  -- ---------- Admin override ----------
  PERFORM set_config('request.jwt.claim.sub', v_admin.id::text, true);

  -- Reason is mandatory.
  BEGIN
    PERFORM public.admin_override_rollover_batch(v_request, v_batch_cap2, 'NO');
    RAISE EXCEPTION 'short override reason unexpectedly accepted';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM NOT LIKE '%ROLLOVER_OVERRIDE_REASON_REQUIRED%' THEN
      RAISE;
    END IF;
  END;

  -- Override to the second capacity batch.
  v_result := public.admin_override_rollover_batch(
    v_request, v_batch_cap2, 'ADMIN DECIDED FOR TIMETABLE FIT'
  );
  IF (v_result->>'new_batch_id') IS DISTINCT FROM v_batch_cap2::text THEN
    RAISE EXCEPTION 'admin override did not update the batch';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.student_rollover_batch_change_history
    WHERE rollover_request_id = v_request AND new_batch_id = v_batch_cap2
  ) THEN
    RAISE EXCEPTION 'batch change history was not recorded';
  END IF;

  -- ---------- Finalization ----------
  v_result := public.finalize_rollover(v_request, 'TEST FINALIZE');
  IF (v_result->>'already_finalized') IS DISTINCT FROM 'false'
     OR (v_result->>'assignment_id') IS NULL THEN
    RAISE EXCEPTION 'finalize_rollover did not create an assignment';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.student_assignments sa
    WHERE sa.id = (v_result->>'assignment_id')::uuid
      AND sa.academic_year_id = v_target_year
      AND sa.batch_id = v_batch_cap2
      AND sa.status = 'Current'
  ) THEN
    RAISE EXCEPTION 'finalized assignment is inconsistent';
  END IF;

  -- Delayed joining must have produced a rollover break from the year start.
  IF NOT EXISTS (
    SELECT 1 FROM public.student_enrollment_breaks eb
    WHERE eb.rollover_request_id = v_request
      AND eb.source = 'rollover'
      AND eb.fee_treatment = 'waived'
      AND eb.break_from = v_target_start
      AND eb.break_to = (v_target_start + 10) - 1
  ) THEN
    RAISE EXCEPTION 'delayed joining break was not created';
  END IF;

  -- Idempotent re-finalize.
  v_result := public.finalize_rollover(v_request, 'AGAIN');
  IF (v_result->>'already_finalized') IS DISTINCT FROM 'true' THEN
    RAISE EXCEPTION 're-finalize should short-circuit';
  END IF;

  -- Finalize without parent confirmation must be blocked.
  SELECT rr.id INTO v_request_b
  FROM public.student_rollover_requests rr
  WHERE rr.institute_id = v_admin.institute_id
    AND rr.id <> v_request
    AND rr.source_academic_year_id = v_source_year
    AND rr.target_academic_year_id = v_target_year
  ORDER BY rr.student_id
  LIMIT 1;
  IF v_request_b IS NOT NULL THEN
    BEGIN
      PERFORM public.finalize_rollover(v_request_b, 'NO CONFIRM');
      RAISE EXCEPTION 'finalize without confirmation unexpectedly succeeded';
    EXCEPTION WHEN OTHERS THEN
      IF SQLERRM NOT LIKE '%ROLLOVER_FINALIZE_REQUIRES_CONFIRMATION%' THEN
        RAISE;
      END IF;
    END;

    -- Approve without parent confirmation, then finalize.
    BEGIN
      PERFORM public.approve_rollover_request(v_request_b, 'NO');
      RAISE EXCEPTION 'short approval notes unexpectedly accepted';
    EXCEPTION WHEN OTHERS THEN
      IF SQLERRM NOT LIKE '%ROLLOVER_RESOLUTION_NOTES_REQUIRED%' THEN
        RAISE;
      END IF;
    END;

    v_result := public.approve_rollover_request(
      v_request_b, 'ADMIN APPROVAL TO CONTINUE'
    );
    IF (v_result->>'admin_status') IS DISTINCT FROM 'approved' THEN
      RAISE EXCEPTION 'approval did not update the status';
    END IF;

    v_result := public.finalize_rollover(v_request_b, 'APPROVED FINALIZE');
    IF (v_result->>'already_finalized') IS DISTINCT FROM 'false'
       OR (v_result->>'assignment_id') IS NULL THEN
      RAISE EXCEPTION 'approve-then-finalize failed';
    END IF;
  END IF;

  -- ---------- Manual enrollment breaks ----------
  v_break_id := (public.create_enrollment_break(
    v_student_id, v_target_year, v_batch_cap2,
    v_target_start + 20, v_target_start + 30, 'FAMILY TRIP', 'normal', NULL
  )->>'break_id')::uuid;

  IF v_break_id IS NULL THEN
    RAISE EXCEPTION 'manual break was not created';
  END IF;

  v_result := public.complete_enrollment_break(v_break_id, NULL);
  IF (v_result->>'status') IS DISTINCT FROM 'completed' THEN
    RAISE EXCEPTION 'break was not completed';
  END IF;

  -- ---------- Attendance hook ----------
  IF NOT EXISTS (
    SELECT 1 FROM public.get_on_break_assignments(
      v_admin.institute_id, v_target_year, v_batch_cap2, v_target_start + 25
    )
  ) THEN
    RAISE EXCEPTION 'get_on_break_assignments missed the scheduled break day';
  END IF;

  -- A day before the break must not match.
  IF EXISTS (
    SELECT 1 FROM public.get_on_break_assignments(
      v_admin.institute_id, v_target_year, v_batch_cap2, v_target_start + 19
    )
  ) THEN
    RAISE EXCEPTION 'get_on_break_assignments matched a non-break day';
  END IF;

  -- ---------- Detail snapshot for the parent ----------
  PERFORM set_config('request.jwt.claim.sub', v_parent.id::text, true);
  v_detail := public.get_rollover_request_detail(v_request);
  IF (v_detail->>'admin_status') IS DISTINCT FROM 'completed'
     OR (v_detail->>'is_locked') IS DISTINCT FROM 'true' THEN
    RAISE EXCEPTION 'parent detail snapshot is inconsistent';
  END IF;
END $$;

ROLLBACK;