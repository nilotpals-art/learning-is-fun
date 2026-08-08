BEGIN;

ALTER TABLE public.student_assignments
  ADD CONSTRAINT student_assignments_attendance_reference_key
  UNIQUE (id, institute_id, student_id, academic_year_id, batch_id);

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_id_institute_id_key UNIQUE (id, institute_id);

ALTER TABLE public.student_attendance
  ADD COLUMN student_assignment_id uuid NOT NULL,
  ADD COLUMN academic_year_id uuid NOT NULL,
  ADD COLUMN batch_id uuid NOT NULL,
  ALTER COLUMN marked_by SET NOT NULL,
  ALTER COLUMN created_at SET NOT NULL,
  ALTER COLUMN updated_at SET NOT NULL,
  DROP CONSTRAINT student_attendance_status_check,
  ADD CONSTRAINT student_attendance_status_check
    CHECK (status IN ('Present', 'Absent', 'Late', 'Leave')),
  ADD CONSTRAINT student_attendance_assignment_fkey
    FOREIGN KEY (
      student_assignment_id,
      institute_id,
      student_id,
      academic_year_id,
      batch_id
    )
    REFERENCES public.student_assignments (
      id,
      institute_id,
      student_id,
      academic_year_id,
      batch_id
    )
    ON DELETE RESTRICT,
  DROP CONSTRAINT student_attendance_marked_by_fkey,
  ADD CONSTRAINT student_attendance_marked_by_institute_fkey
    FOREIGN KEY (marked_by, institute_id)
    REFERENCES public.profiles (id, institute_id)
    ON DELETE RESTRICT;

CREATE INDEX student_attendance_institute_date_batch_idx
  ON public.student_attendance (institute_id, attendance_date, batch_id);

ALTER TABLE public.student_attendance ENABLE ROW LEVEL SECURITY;

CREATE POLICY student_attendance_admin_select
ON public.student_attendance
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    LEFT JOIN public.roles r ON r.id = p.role_id
    WHERE p.id = (SELECT auth.uid())
      AND p.is_active IS TRUE
      AND p.institute_id = student_attendance.institute_id
      AND COALESCE(NULLIF(btrim(p.role), ''), r.name)
        IN ('admin', 'Super Admin', 'Institute Admin')
  )
);

REVOKE ALL ON TABLE public.student_attendance FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.student_attendance TO authenticated;

CREATE FUNCTION public.save_daily_attendance(
  p_attendance_date date,
  p_academic_year_id uuid,
  p_batch_id uuid,
  p_entries jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_profile_id uuid;
  v_institute_id uuid;
  v_role text;
  v_roster_count integer;
  v_entry_count integer;
  v_inserted_count integer;
BEGIN
  SELECT p.id, p.institute_id, COALESCE(NULLIF(btrim(p.role), ''), r.name)
  INTO v_profile_id, v_institute_id, v_role
  FROM public.profiles p
  LEFT JOIN public.roles r ON r.id = p.role_id
  WHERE p.id = auth.uid()
    AND p.is_active IS TRUE;

  IF v_profile_id IS NULL
     OR v_institute_id IS NULL
     OR v_role NOT IN ('admin', 'Super Admin', 'Institute Admin') THEN
    RAISE EXCEPTION 'ATTENDANCE_UNAUTHORIZED';
  END IF;

  IF p_attendance_date IS NULL THEN
    RAISE EXCEPTION 'ATTENDANCE_DATE_REQUIRED';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.academic_years ay
    WHERE ay.id = p_academic_year_id
      AND ay.institute_id = v_institute_id
      AND ay.is_active IS TRUE
      AND p_attendance_date BETWEEN ay.start_date AND ay.end_date
  ) THEN
    RAISE EXCEPTION 'ATTENDANCE_ACADEMIC_YEAR_INVALID';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.batches b
    WHERE b.id = p_batch_id
      AND b.institute_id = v_institute_id
      AND b.is_active IS TRUE
  ) THEN
    RAISE EXCEPTION 'ATTENDANCE_BATCH_INVALID';
  END IF;

  IF p_entries IS NULL OR jsonb_typeof(p_entries) <> 'array' THEN
    RAISE EXCEPTION 'ATTENDANCE_ENTRIES_INVALID';
  END IF;

  CREATE TEMP TABLE attendance_entries_input (
    assignment_id uuid NOT NULL,
    student_id uuid NOT NULL,
    status text NOT NULL,
    remarks text
  ) ON COMMIT DROP;

  BEGIN
    INSERT INTO attendance_entries_input (assignment_id, student_id, status, remarks)
    SELECT
      (entry->>'assignmentId')::uuid,
      (entry->>'studentId')::uuid,
      entry->>'status',
      NULLIF(upper(btrim(entry->>'remarks')), '')
    FROM jsonb_array_elements(p_entries) AS entry;
  EXCEPTION
    WHEN invalid_text_representation OR not_null_violation THEN
      RAISE EXCEPTION 'ATTENDANCE_ENTRIES_INVALID';
  END;

  SELECT count(*) INTO v_entry_count FROM attendance_entries_input;
  IF v_entry_count = 0 THEN
    RAISE EXCEPTION 'ATTENDANCE_ROSTER_EMPTY';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM attendance_entries_input e
    WHERE e.status NOT IN ('Present', 'Absent', 'Late', 'Leave')
       OR char_length(COALESCE(e.remarks, '')) > 250
  ) THEN
    RAISE EXCEPTION 'ATTENDANCE_ENTRY_INVALID';
  END IF;

  IF (SELECT count(*) FROM (
    SELECT DISTINCT assignment_id, student_id FROM attendance_entries_input
  ) distinct_entries) <> v_entry_count THEN
    RAISE EXCEPTION 'ATTENDANCE_ENTRIES_DUPLICATE';
  END IF;

  PERFORM 1
  FROM public.student_assignments sa
  WHERE sa.institute_id = v_institute_id
    AND sa.academic_year_id = p_academic_year_id
    AND sa.batch_id = p_batch_id
    AND sa.effective_from <= p_attendance_date
    AND (sa.effective_to IS NULL OR sa.effective_to >= p_attendance_date)
  FOR UPDATE;

  SELECT count(*) INTO v_roster_count
  FROM public.student_assignments sa
  WHERE sa.institute_id = v_institute_id
    AND sa.academic_year_id = p_academic_year_id
    AND sa.batch_id = p_batch_id
    AND sa.effective_from <= p_attendance_date
    AND (sa.effective_to IS NULL OR sa.effective_to >= p_attendance_date);

  IF v_roster_count = 0 THEN
    RAISE EXCEPTION 'ATTENDANCE_ROSTER_EMPTY';
  END IF;

  IF v_entry_count <> v_roster_count OR EXISTS (
    SELECT 1
    FROM attendance_entries_input e
    LEFT JOIN public.student_assignments sa
      ON sa.id = e.assignment_id
     AND sa.student_id = e.student_id
     AND sa.institute_id = v_institute_id
     AND sa.academic_year_id = p_academic_year_id
     AND sa.batch_id = p_batch_id
     AND sa.effective_from <= p_attendance_date
     AND (sa.effective_to IS NULL OR sa.effective_to >= p_attendance_date)
    WHERE sa.id IS NULL
  ) THEN
    RAISE EXCEPTION 'ATTENDANCE_ROSTER_MISMATCH';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.student_attendance a
    JOIN attendance_entries_input e ON e.student_id = a.student_id
    WHERE a.attendance_date = p_attendance_date
  ) THEN
    RAISE EXCEPTION 'ATTENDANCE_ALREADY_RECORDED';
  END IF;

  INSERT INTO public.student_attendance (
    institute_id,
    student_id,
    student_assignment_id,
    academic_year_id,
    batch_id,
    attendance_date,
    status,
    remarks,
    marked_by,
    created_at,
    updated_at
  )
  SELECT
    v_institute_id,
    e.student_id,
    e.assignment_id,
    p_academic_year_id,
    p_batch_id,
    p_attendance_date,
    e.status,
    e.remarks,
    v_profile_id,
    now(),
    now()
  FROM attendance_entries_input e;

  GET DIAGNOSTICS v_inserted_count = ROW_COUNT;
  RETURN jsonb_build_object('inserted_count', v_inserted_count);
EXCEPTION
  WHEN unique_violation THEN
    RAISE EXCEPTION 'ATTENDANCE_ALREADY_RECORDED';
  WHEN foreign_key_violation THEN
    RAISE EXCEPTION 'ATTENDANCE_ROSTER_MISMATCH';
END;
$$;

CREATE FUNCTION public.update_student_attendance(
  p_attendance_id uuid,
  p_status text,
  p_remarks text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_profile_id uuid;
  v_institute_id uuid;
  v_role text;
  v_updated_at timestamptz;
BEGIN
  SELECT p.id, p.institute_id, COALESCE(NULLIF(btrim(p.role), ''), r.name)
  INTO v_profile_id, v_institute_id, v_role
  FROM public.profiles p
  LEFT JOIN public.roles r ON r.id = p.role_id
  WHERE p.id = auth.uid()
    AND p.is_active IS TRUE;

  IF v_profile_id IS NULL
     OR v_institute_id IS NULL
     OR v_role NOT IN ('admin', 'Super Admin', 'Institute Admin') THEN
    RAISE EXCEPTION 'ATTENDANCE_UNAUTHORIZED';
  END IF;

  IF p_attendance_id IS NULL
     OR p_status NOT IN ('Present', 'Absent', 'Late', 'Leave')
     OR char_length(COALESCE(NULLIF(upper(btrim(p_remarks)), ''), '')) > 250 THEN
    RAISE EXCEPTION 'ATTENDANCE_ENTRY_INVALID';
  END IF;

  UPDATE public.student_attendance
  SET status = p_status,
      remarks = NULLIF(upper(btrim(p_remarks)), ''),
      marked_by = v_profile_id,
      updated_at = now()
  WHERE id = p_attendance_id
    AND institute_id = v_institute_id
  RETURNING updated_at INTO v_updated_at;

  IF v_updated_at IS NULL THEN
    RAISE EXCEPTION 'ATTENDANCE_NOT_FOUND';
  END IF;

  RETURN jsonb_build_object('updated_at', v_updated_at);
END;
$$;

REVOKE ALL ON FUNCTION public.save_daily_attendance(date, uuid, uuid, jsonb)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_daily_attendance(date, uuid, uuid, jsonb)
  TO authenticated;

REVOKE ALL ON FUNCTION public.update_student_attendance(uuid, text, text)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_student_attendance(uuid, text, text)
  TO authenticated;

COMMIT;
