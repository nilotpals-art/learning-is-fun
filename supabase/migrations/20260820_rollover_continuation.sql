BEGIN;

-- =====================================================================
-- Academic Year Rollover + Parent Continuation Confirmation
-- =====================================================================

-- 1) Optional response deadline on academic years (admin-managed).
ALTER TABLE public.academic_years
  ADD COLUMN continuation_response_deadline date;

-- 2) Optional teaching batch capacity. NULL = unlimited seats.
ALTER TABLE public.batches
  ADD COLUMN IF NOT EXISTS capacity integer;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'batches_capacity_check'
      AND conrelid = 'public.batches'::regclass
  ) THEN
    ALTER TABLE public.batches
      ADD CONSTRAINT batches_capacity_check
      CHECK (capacity IS NULL OR capacity > 0);
  END IF;
END $$;

-- 3) Rollover request lifecycle (one active request per student per rollover).
CREATE TABLE public.student_rollover_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institute_id uuid NOT NULL,
  branch_id uuid,
  student_id uuid NOT NULL,
  source_assignment_id uuid NOT NULL,
  source_academic_year_id uuid NOT NULL,
  target_academic_year_id uuid NOT NULL,
  proposed_class_id uuid NOT NULL,
  proposed_board_id uuid NOT NULL,
  parent_response text NOT NULL DEFAULT 'pending'
    CHECK (parent_response IN ('pending', 'continuing', 'not_continuing', 'undecided')),
  joining_type text
    CHECK (joining_type IS NULL OR joining_type IN ('normal', 'delayed')),
  expected_joining_date date,
  selected_batch_id uuid,
  parent_notes text,
  parent_confirmed_at timestamptz,
  parent_confirmed_by uuid,
  parent_locked_at timestamptz,
  admin_status text NOT NULL DEFAULT 'pending'
    CHECK (admin_status IN ('pending', 'ready', 'approved', 'rejected', 'completed', 'cancelled')),
  admin_notes text,
  finalized_assignment_id uuid,
  finalized_at timestamptz,
  finalized_by uuid,
  response_deadline date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT rollover_requests_delayed_joining_check
    CHECK (
      (joining_type IS NULL AND expected_joining_date IS NULL)
      OR (joining_type = 'normal' AND expected_joining_date IS NULL)
      OR (joining_type = 'delayed' AND expected_joining_date IS NOT NULL)
    ),
  CONSTRAINT rollover_requests_institute_fkey
    FOREIGN KEY (institute_id) REFERENCES public.institutes (id) ON DELETE RESTRICT,
  CONSTRAINT rollover_requests_branch_fkey
    FOREIGN KEY (branch_id, institute_id) REFERENCES public.branches (id, institute_id) ON DELETE RESTRICT,
  CONSTRAINT rollover_requests_student_fkey
    FOREIGN KEY (student_id, institute_id) REFERENCES public.students (id, institute_id) ON DELETE RESTRICT,
  CONSTRAINT rollover_requests_source_assignment_fkey
    FOREIGN KEY (source_assignment_id) REFERENCES public.student_assignments (id) ON DELETE RESTRICT,
  CONSTRAINT rollover_requests_source_year_fkey
    FOREIGN KEY (source_academic_year_id, institute_id)
    REFERENCES public.academic_years (id, institute_id) ON DELETE RESTRICT,
  CONSTRAINT rollover_requests_target_year_fkey
    FOREIGN KEY (target_academic_year_id, institute_id)
    REFERENCES public.academic_years (id, institute_id) ON DELETE RESTRICT,
  CONSTRAINT rollover_requests_class_fkey
    FOREIGN KEY (proposed_class_id, institute_id)
    REFERENCES public.academic_classes (id, institute_id) ON DELETE RESTRICT,
  CONSTRAINT rollover_requests_board_fkey
    FOREIGN KEY (proposed_board_id, institute_id)
    REFERENCES public.boards (id, institute_id) ON DELETE RESTRICT,
  CONSTRAINT rollover_requests_selected_batch_fkey
    FOREIGN KEY (selected_batch_id, institute_id) REFERENCES public.batches (id, institute_id) ON DELETE RESTRICT,
  CONSTRAINT rollover_requests_parent_confirmed_by_fkey
    FOREIGN KEY (parent_confirmed_by, institute_id) REFERENCES public.profiles (id, institute_id) ON DELETE RESTRICT,
  CONSTRAINT rollover_requests_finalized_by_fkey
    FOREIGN KEY (finalized_by, institute_id) REFERENCES public.profiles (id, institute_id) ON DELETE RESTRICT,
  CONSTRAINT rollover_requests_finalized_assignment_fkey
    FOREIGN KEY (finalized_assignment_id) REFERENCES public.student_assignments (id) ON DELETE RESTRICT
);

CREATE UNIQUE INDEX rollover_requests_one_active_per_student_idx
  ON public.student_rollover_requests (institute_id, student_id, source_academic_year_id, target_academic_year_id)
  WHERE admin_status NOT IN ('cancelled', 'completed');
CREATE INDEX rollover_requests_admin_scope_idx
  ON public.student_rollover_requests (institute_id, admin_status, target_academic_year_id);
CREATE INDEX rollover_requests_student_idx
  ON public.student_rollover_requests (student_id, admin_status);
CREATE INDEX rollover_requests_batch_idx
  ON public.student_rollover_requests (selected_batch_id) WHERE selected_batch_id IS NOT NULL;

ALTER TABLE public.student_rollover_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY rollover_requests_admin_select ON public.student_rollover_requests
FOR SELECT TO authenticated
USING (public.learning_planner_admin_scope(institute_id, branch_id));

CREATE POLICY rollover_requests_parent_select ON public.student_rollover_requests
FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1
  FROM public.parents p
  JOIN public.student_parent_links spl ON spl.parent_id = p.id AND spl.institute_id = p.institute_id
  WHERE p.profile_id = (SELECT auth.uid())
    AND p.institute_id = student_rollover_requests.institute_id
    AND p.is_active IS TRUE
    AND spl.student_id = student_rollover_requests.student_id
));

REVOKE ALL ON TABLE public.student_rollover_requests FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.student_rollover_requests TO authenticated;

-- 4) Enrollment breaks (fee treatment is prepared for the future fee engine).
CREATE TABLE public.student_enrollment_breaks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institute_id uuid NOT NULL,
  branch_id uuid,
  student_id uuid NOT NULL,
  student_assignment_id uuid NOT NULL,
  academic_year_id uuid NOT NULL,
  batch_id uuid NOT NULL,
  break_from date NOT NULL,
  break_to date NOT NULL,
  status text NOT NULL DEFAULT 'scheduled'
    CHECK (status IN ('scheduled', 'active', 'completed', 'cancelled')),
  reason text,
  fee_treatment text NOT NULL DEFAULT 'normal'
    CHECK (fee_treatment IN ('normal', 'waived', 'partial', 'custom')),
  fee_treatment_notes text,
  source text NOT NULL DEFAULT 'manual'
    CHECK (source IN ('manual', 'rollover')),
  rollover_request_id uuid,
  created_by uuid NOT NULL,
  actual_resumption_date date,
  completed_at timestamptz,
  cancelled_at timestamptz,
  cancelled_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT enrollment_breaks_date_check CHECK (break_to >= break_from),
  CONSTRAINT enrollment_breaks_institute_fkey
    FOREIGN KEY (institute_id) REFERENCES public.institutes (id) ON DELETE RESTRICT,
  CONSTRAINT enrollment_breaks_branch_fkey
    FOREIGN KEY (branch_id, institute_id) REFERENCES public.branches (id, institute_id) ON DELETE RESTRICT,
  CONSTRAINT enrollment_breaks_assignment_fkey
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
  CONSTRAINT enrollment_breaks_rollover_request_fkey
    FOREIGN KEY (rollover_request_id) REFERENCES public.student_rollover_requests (id) ON DELETE RESTRICT,
  CONSTRAINT enrollment_breaks_created_by_fkey
    FOREIGN KEY (created_by, institute_id) REFERENCES public.profiles (id, institute_id) ON DELETE RESTRICT
);

CREATE INDEX enrollment_breaks_scope_idx
  ON public.student_enrollment_breaks (institute_id, academic_year_id, batch_id, status);
CREATE INDEX enrollment_breaks_student_idx
  ON public.student_enrollment_breaks (student_id, status);
CREATE INDEX enrollment_breaks_date_idx
  ON public.student_enrollment_breaks (institute_id, status, break_from, break_to);

ALTER TABLE public.student_enrollment_breaks ENABLE ROW LEVEL SECURITY;

CREATE POLICY enrollment_breaks_admin_select ON public.student_enrollment_breaks
FOR SELECT TO authenticated
USING (public.learning_planner_admin_scope(institute_id, branch_id));

CREATE POLICY enrollment_breaks_parent_select ON public.student_enrollment_breaks
FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1
  FROM public.parents p
  JOIN public.student_parent_links spl ON spl.parent_id = p.id AND spl.institute_id = p.institute_id
  WHERE p.profile_id = (SELECT auth.uid())
    AND p.institute_id = student_enrollment_breaks.institute_id
    AND p.is_active IS TRUE
    AND spl.student_id = student_enrollment_breaks.student_id
));

REVOKE ALL ON TABLE public.student_enrollment_breaks FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.student_enrollment_breaks TO authenticated;

-- 5) Audit history for admin batch overrides during rollover.
CREATE TABLE public.student_rollover_batch_change_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institute_id uuid NOT NULL,
  rollover_request_id uuid NOT NULL,
  previous_batch_id uuid,
  new_batch_id uuid NOT NULL,
  reason text NOT NULL,
  changed_by uuid NOT NULL,
  changed_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT rollover_batch_history_institute_fkey
    FOREIGN KEY (institute_id) REFERENCES public.institutes (id) ON DELETE RESTRICT,
  CONSTRAINT rollover_batch_history_request_fkey
    FOREIGN KEY (rollover_request_id) REFERENCES public.student_rollover_requests (id) ON DELETE RESTRICT,
  CONSTRAINT rollover_batch_history_previous_batch_fkey
    FOREIGN KEY (previous_batch_id, institute_id) REFERENCES public.batches (id, institute_id) ON DELETE RESTRICT,
  CONSTRAINT rollover_batch_history_new_batch_fkey
    FOREIGN KEY (new_batch_id, institute_id) REFERENCES public.batches (id, institute_id) ON DELETE RESTRICT,
  CONSTRAINT rollover_batch_history_changed_by_fkey
    FOREIGN KEY (changed_by, institute_id) REFERENCES public.profiles (id, institute_id) ON DELETE RESTRICT
);

CREATE INDEX rollover_batch_history_request_idx
  ON public.student_rollover_batch_change_history (rollover_request_id, changed_at DESC);

ALTER TABLE public.student_rollover_batch_change_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY rollover_batch_history_admin_select ON public.student_rollover_batch_change_history
FOR SELECT TO authenticated
USING (public.learning_planner_admin_scope(institute_id, NULL));

REVOKE ALL ON TABLE public.student_rollover_batch_change_history FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.student_rollover_batch_change_history TO authenticated;

-- =====================================================================
-- Helpers
-- =====================================================================

-- Available seats in a batch for the target year. NULL = unlimited.
CREATE FUNCTION public.rollover_seat_availability(
  p_batch_id uuid,
  p_target_year_id uuid,
  p_exclude_request_id uuid DEFAULT NULL
)
RETURNS integer
LANGUAGE sql
STABLE
SET search_path = ''
AS $$
  SELECT
    CASE
      WHEN b.capacity IS NULL THEN NULL
      ELSE b.capacity
        - (SELECT count(*) FROM public.student_assignments sa
           WHERE sa.batch_id = p_batch_id
             AND sa.academic_year_id = p_target_year_id
             AND sa.status = 'Current')
        - (SELECT count(*) FROM public.student_rollover_requests rr
           WHERE rr.selected_batch_id = p_batch_id
             AND rr.target_academic_year_id = p_target_year_id
             AND rr.parent_locked_at IS NOT NULL
             AND rr.admin_status IN ('ready', 'approved')
             AND (p_exclude_request_id IS NULL OR rr.id <> p_exclude_request_id))
    END
  FROM public.batches b
  WHERE b.id = p_batch_id;
$$;

REVOKE ALL ON FUNCTION public.rollover_seat_availability(uuid, uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rollover_seat_availability(uuid, uuid, uuid) TO authenticated;

-- Validates that a candidate batch is usable for a given rollover request.
CREATE FUNCTION public.rollover_batch_is_valid(
  p_request_id uuid,
  p_batch_id uuid,
  p_require_availability boolean DEFAULT false
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SET search_path = ''
AS $$
DECLARE
  v_request public.student_rollover_requests%ROWTYPE;
  v_available integer;
  v_existing_count integer;
BEGIN
  SELECT * INTO v_request FROM public.student_rollover_requests WHERE id = p_request_id;
  IF v_request.id IS NULL THEN
    RETURN false;
  END IF;

  SELECT count(*) INTO v_existing_count
  FROM public.batches b
  WHERE b.id = p_batch_id
    AND b.institute_id = v_request.institute_id
    AND b.academic_year_id = v_request.target_academic_year_id
    AND b.board_id = v_request.proposed_board_id
    AND b.class_id = v_request.proposed_class_id
    AND b.is_active IS TRUE;
  IF v_existing_count = 0 THEN
    RETURN false;
  END IF;

  IF p_require_availability THEN
    SELECT public.rollover_seat_availability(p_batch_id, v_request.target_academic_year_id, v_request.id)
    INTO v_available;
    IF v_available IS NOT NULL AND v_available < 1 THEN
      RETURN false;
    END IF;
  END IF;

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.rollover_batch_is_valid(uuid, uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rollover_batch_is_valid(uuid, uuid, boolean) TO authenticated;

-- =====================================================================
-- Admin: generate the rollover workspace
-- =====================================================================
CREATE FUNCTION public.generate_rollover_workspace(
  p_source_year_id uuid,
  p_target_year_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_profile public.profiles%ROWTYPE;
  v_institute_id uuid;
  v_created integer := 0;
  v_skipped integer := 0;
  v_deadline date;
  v_request public.student_rollover_requests%ROWTYPE;
  r public.student_assignments%ROWTYPE;
  v_source_ay public.academic_years%ROWTYPE;
  v_target_ay public.academic_years%ROWTYPE;
BEGIN
  SELECT * INTO v_profile
  FROM public.profiles p
  WHERE p.id = auth.uid() AND p.is_active IS TRUE;

  IF v_profile.id IS NULL
     OR NOT public.learning_planner_admin_scope(v_profile.institute_id, v_profile.branch_id) THEN
    RAISE EXCEPTION 'ROLLOVER_UNAUTHORIZED';
  END IF;
  v_institute_id := v_profile.institute_id;

  IF p_source_year_id IS NULL OR p_target_year_id IS NULL THEN
    RAISE EXCEPTION 'ROLLOVER_YEARS_REQUIRED';
  END IF;

  IF p_source_year_id = p_target_year_id THEN
    RAISE EXCEPTION 'ROLLOVER_YEARS_MUST_DIFFER';
  END IF;

  SELECT * INTO v_source_ay
  FROM public.academic_years ay
  WHERE ay.id = p_source_year_id AND ay.institute_id = v_institute_id AND ay.is_active IS TRUE;

  IF v_source_ay.id IS NULL THEN
    RAISE EXCEPTION 'ROLLOVER_SOURCE_YEAR_INVALID';
  END IF;

  SELECT * INTO v_target_ay
  FROM public.academic_years ay
  WHERE ay.id = p_target_year_id AND ay.institute_id = v_institute_id AND ay.is_active IS TRUE;

  IF v_target_ay.id IS NULL THEN
    RAISE EXCEPTION 'ROLLOVER_TARGET_YEAR_INVALID';
  END IF;

  IF v_target_ay.start_date <= v_source_ay.start_date THEN
    RAISE EXCEPTION 'ROLLOVER_TARGET_YEAR_INVALID';
  END IF;

  v_deadline := v_target_ay.continuation_response_deadline;

  FOR r IN
    SELECT sa.*
    FROM public.student_assignments sa
    JOIN public.students s ON s.id = sa.student_id AND s.institute_id = sa.institute_id
    WHERE sa.institute_id = v_institute_id
      AND sa.academic_year_id = p_source_year_id
      AND sa.status = 'Current'
      AND sa.effective_to IS NULL
      AND s.status = 'Active'
    ORDER BY sa.student_id
  LOOP
    SELECT * INTO v_request
    FROM public.student_rollover_requests rr
    WHERE rr.institute_id = v_institute_id
      AND rr.student_id = r.student_id
      AND rr.source_academic_year_id = p_source_year_id
      AND rr.target_academic_year_id = p_target_year_id
      AND rr.admin_status NOT IN ('cancelled', 'completed')
    LIMIT 1;

    IF v_request.id IS NOT NULL THEN
      v_skipped := v_skipped + 1;
      CONTINUE;
    END IF;

    INSERT INTO public.student_rollover_requests (
      institute_id,
      branch_id,
      student_id,
      source_assignment_id,
      source_academic_year_id,
      target_academic_year_id,
      proposed_class_id,
      proposed_board_id,
      parent_response,
      admin_status,
      response_deadline
    ) VALUES (
      v_institute_id,
      (SELECT branch_id FROM public.batches b WHERE b.id = r.batch_id),
      r.student_id,
      r.id,
      p_source_year_id,
      p_target_year_id,
      r.class_id,
      r.board_id,
      'pending',
      'pending',
      v_deadline
    );
    v_created := v_created + 1;
  END LOOP;

  RETURN jsonb_build_object('created', v_created, 'skipped_existing', v_skipped);
END;
$$;

REVOKE ALL ON FUNCTION public.generate_rollover_workspace(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.generate_rollover_workspace(uuid, uuid) TO authenticated;

-- Admin: set the optional response deadline for a target academic year.
CREATE FUNCTION public.set_rollover_response_deadline(
  p_academic_year_id uuid,
  p_deadline date
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_profile public.profiles%ROWTYPE;
  v_institute_id uuid;
BEGIN
  SELECT * INTO v_profile
  FROM public.profiles p
  WHERE p.id = auth.uid() AND p.is_active IS TRUE;

  IF v_profile.id IS NULL
     OR NOT public.learning_planner_admin_scope(v_profile.institute_id, v_profile.branch_id) THEN
    RAISE EXCEPTION 'ROLLOVER_UNAUTHORIZED';
  END IF;
  v_institute_id := v_profile.institute_id;

  IF NOT EXISTS (
    SELECT 1 FROM public.academic_years ay
    WHERE ay.id = p_academic_year_id AND ay.institute_id = v_institute_id AND ay.is_active IS TRUE
  ) THEN
    RAISE EXCEPTION 'ROLLOVER_TARGET_YEAR_INVALID';
  END IF;

  UPDATE public.academic_years
  SET continuation_response_deadline = p_deadline
  WHERE id = p_academic_year_id AND institute_id = v_institute_id;

  UPDATE public.student_rollover_requests
  SET response_deadline = p_deadline
  WHERE target_academic_year_id = p_academic_year_id AND institute_id = v_institute_id;

  RETURN jsonb_build_object('updated_year_id', p_academic_year_id, 'deadline', p_deadline);
END;
$$;

REVOKE ALL ON FUNCTION public.set_rollover_response_deadline(uuid, date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_rollover_response_deadline(uuid, date) TO authenticated;

-- =====================================================================
-- Parent + admin: eligible batches for a request (RLS-safe)
-- =====================================================================
CREATE FUNCTION public.list_rollover_eligible_batches(p_request_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_request public.student_rollover_requests%ROWTYPE;
  v_profile public.profiles%ROWTYPE;
  v_role text;
  v_results jsonb := '[]'::jsonb;
  v_row record;
  v_available integer;
BEGIN
  SELECT * INTO v_request FROM public.student_rollover_requests WHERE id = p_request_id;
  IF v_request.id IS NULL THEN
    RAISE EXCEPTION 'ROLLOVER_REQUEST_NOT_FOUND';
  END IF;

  SELECT * INTO v_profile
  FROM public.profiles p
  WHERE p.id = auth.uid() AND p.is_active IS TRUE;
  SELECT COALESCE(NULLIF(btrim(p.role), ''), r.name) INTO v_role
  FROM public.profiles p LEFT JOIN public.roles r ON r.id = p.role_id
  WHERE p.id = auth.uid();

  IF v_profile.id IS NULL THEN
    RAISE EXCEPTION 'ROLLOVER_UNAUTHORIZED';
  END IF;

  IF v_role IN ('admin', 'Super Admin', 'Institute Admin') THEN
    IF v_profile.institute_id <> v_request.institute_id THEN
      RAISE EXCEPTION 'ROLLOVER_UNAUTHORIZED';
    END IF;
  ELSIF v_role = 'Parent' THEN
    IF NOT EXISTS (
      SELECT 1
      FROM public.parents pa
      JOIN public.student_parent_links spl ON spl.parent_id = pa.id AND spl.institute_id = pa.institute_id
      WHERE pa.profile_id = v_profile.id
        AND pa.institute_id = v_request.institute_id
        AND pa.is_active IS TRUE
        AND spl.student_id = v_request.student_id
    ) THEN
      RAISE EXCEPTION 'ROLLOVER_UNAUTHORIZED';
    END IF;
  ELSE
    RAISE EXCEPTION 'ROLLOVER_UNAUTHORIZED';
  END IF;

  FOR v_row IN
    SELECT b.id, b.name, b.branch_id, b.subject_id, b.capacity,
           br.name AS branch_name, s.subject_name,
           (SELECT count(*) FROM public.student_assignments sa
             WHERE sa.batch_id = b.id
               AND sa.academic_year_id = v_request.target_academic_year_id
               AND sa.status = 'Current') AS assigned,
           (SELECT count(*) FROM public.student_rollover_requests rr
             WHERE rr.selected_batch_id = b.id
               AND rr.target_academic_year_id = v_request.target_academic_year_id
               AND rr.parent_locked_at IS NOT NULL
               AND rr.admin_status IN ('ready', 'approved')
               AND rr.id <> v_request.id) AS reserved
    FROM public.batches b
    LEFT JOIN public.branches br ON br.id = b.branch_id AND br.institute_id = b.institute_id
    LEFT JOIN public.subjects s ON s.id = b.subject_id AND s.institute_id = b.institute_id
    WHERE b.institute_id = v_request.institute_id
      AND b.academic_year_id = v_request.target_academic_year_id
      AND b.board_id = v_request.proposed_board_id
      AND b.class_id = v_request.proposed_class_id
      AND b.is_active IS TRUE
    ORDER BY b.name
  LOOP
    v_available := CASE WHEN v_row.capacity IS NULL THEN NULL
                        ELSE v_row.capacity - v_row.assigned - v_row.reserved END;
    v_results := v_results || jsonb_build_object(
      'batch_id', v_row.id,
      'batch_name', v_row.name,
      'branch_name', v_row.branch_name,
      'subject_name', v_row.subject_name,
      'capacity', v_row.capacity,
      'assigned', v_row.assigned,
      'reserved', v_row.reserved,
      'available', v_available
    );
  END LOOP;

  RETURN v_results;
END;
$$;

REVOKE ALL ON FUNCTION public.list_rollover_eligible_batches(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_rollover_eligible_batches(uuid) TO authenticated;

-- =====================================================================
-- Parent: save the continuation response (before confirmation)
-- =====================================================================
CREATE FUNCTION public.save_parent_rollover_response(
  p_request_id uuid,
  p_parent_response text,
  p_joining_type text,
  p_expected_joining_date date,
  p_selected_batch_id uuid,
  p_notes text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_request public.student_rollover_requests%ROWTYPE;
  v_profile public.profiles%ROWTYPE;
  v_target_start date;
  v_batch_valid boolean;
BEGIN
  SELECT * INTO v_request FROM public.student_rollover_requests WHERE id = p_request_id;
  IF v_request.id IS NULL THEN
    RAISE EXCEPTION 'ROLLOVER_REQUEST_NOT_FOUND';
  END IF;

  SELECT * INTO v_profile
  FROM public.profiles p
  WHERE p.id = auth.uid() AND p.is_active IS TRUE;

  IF v_profile.id IS NULL
     OR NOT EXISTS (
       SELECT 1
       FROM public.parents pa
       JOIN public.student_parent_links spl ON spl.parent_id = pa.id AND spl.institute_id = pa.institute_id
       WHERE pa.profile_id = v_profile.id
         AND pa.institute_id = v_request.institute_id
         AND pa.is_active IS TRUE
         AND spl.student_id = v_request.student_id
     ) THEN
    RAISE EXCEPTION 'ROLLOVER_UNAUTHORIZED';
  END IF;

  IF v_request.parent_locked_at IS NOT NULL THEN
    RAISE EXCEPTION 'ROLLOVER_RESPONSE_LOCKED';
  END IF;

  IF v_request.admin_status IN ('completed', 'cancelled', 'rejected') THEN
    RAISE EXCEPTION 'ROLLOVER_REQUEST_CLOSED';
  END IF;

  IF p_parent_response IS NULL
     OR p_parent_response NOT IN ('pending', 'continuing', 'not_continuing', 'undecided') THEN
    RAISE EXCEPTION 'ROLLOVER_RESPONSE_INVALID';
  END IF;

  IF p_parent_response <> 'continuing'
     AND (p_joining_type IS NOT NULL OR p_selected_batch_id IS NOT NULL) THEN
    RAISE EXCEPTION 'ROLLOVER_RESPONSE_INVALID';
  END IF;

  IF p_parent_response = 'continuing' THEN
    IF p_joining_type IS NULL OR p_joining_type NOT IN ('normal', 'delayed') THEN
      RAISE EXCEPTION 'ROLLOVER_JOINING_TYPE_REQUIRED';
    END IF;

    IF p_joining_type = 'delayed' THEN
      IF p_expected_joining_date IS NULL THEN
        RAISE EXCEPTION 'ROLLOVER_JOINING_DATE_REQUIRED';
      END IF;
      SELECT start_date INTO v_target_start
      FROM public.academic_years ay
      WHERE ay.id = v_request.target_academic_year_id AND ay.institute_id = v_request.institute_id;
      IF p_expected_joining_date < v_target_start THEN
        RAISE EXCEPTION 'ROLLOVER_JOINING_DATE_INVALID';
      END IF;
    END IF;

    IF p_selected_batch_id IS NOT NULL THEN
      SELECT public.rollover_batch_is_valid(v_request.id, p_selected_batch_id, false)
      INTO v_batch_valid;
      IF NOT v_batch_valid THEN
        RAISE EXCEPTION 'ROLLOVER_BATCH_INCOMPATIBLE';
      END IF;
    END IF;
  END IF;

  UPDATE public.student_rollover_requests
  SET parent_response = p_parent_response,
      joining_type = CASE WHEN p_parent_response = 'continuing' THEN p_joining_type ELSE NULL END,
      expected_joining_date = CASE WHEN p_parent_response = 'continuing' THEN p_expected_joining_date ELSE NULL END,
      selected_batch_id = CASE WHEN p_parent_response = 'continuing' THEN p_selected_batch_id ELSE NULL END,
      parent_notes = NULLIF(btrim(p_notes), ''),
      admin_status = CASE WHEN p_parent_response = 'pending' THEN 'pending' ELSE 'ready' END,
      updated_at = now()
  WHERE id = v_request.id;

  RETURN jsonb_build_object('request_id', v_request.id, 'status', 'saved');
END;
$$;

REVOKE ALL ON FUNCTION public.save_parent_rollover_response(uuid, text, text, date, uuid, text)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_parent_rollover_response(uuid, text, text, date, uuid, text)
  TO authenticated;

-- =====================================================================
-- Parent: final confirmation (locks the choice, concurrency-safe)
-- =====================================================================
CREATE FUNCTION public.confirm_parent_rollover(p_request_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_request public.student_rollover_requests%ROWTYPE;
  v_profile public.profiles%ROWTYPE;
  v_available integer;
BEGIN
  SELECT * INTO v_request FROM public.student_rollover_requests WHERE id = p_request_id;
  IF v_request.id IS NULL THEN
    RAISE EXCEPTION 'ROLLOVER_REQUEST_NOT_FOUND';
  END IF;

  SELECT * INTO v_profile
  FROM public.profiles p
  WHERE p.id = auth.uid() AND p.is_active IS TRUE;

  IF v_profile.id IS NULL
     OR NOT EXISTS (
       SELECT 1
       FROM public.parents pa
       JOIN public.student_parent_links spl ON spl.parent_id = pa.id AND spl.institute_id = pa.institute_id
       WHERE pa.profile_id = v_profile.id
         AND pa.institute_id = v_request.institute_id
         AND pa.is_active IS TRUE
         AND spl.student_id = v_request.student_id
     ) THEN
    RAISE EXCEPTION 'ROLLOVER_UNAUTHORIZED';
  END IF;

  IF v_request.parent_locked_at IS NOT NULL THEN
    RAISE EXCEPTION 'ROLLOVER_ALREADY_CONFIRMED';
  END IF;

  IF v_request.admin_status IN ('completed', 'cancelled', 'rejected') THEN
    RAISE EXCEPTION 'ROLLOVER_REQUEST_CLOSED';
  END IF;

  IF v_request.parent_response <> 'continuing' THEN
    RAISE EXCEPTION 'ROLLOVER_RESPONSE_NOT_CONTINUING';
  END IF;

  IF v_request.selected_batch_id IS NULL THEN
    RAISE EXCEPTION 'ROLLOVER_BATCH_REQUIRED';
  END IF;

  IF v_request.joining_type = 'delayed' AND v_request.expected_joining_date IS NULL THEN
    RAISE EXCEPTION 'ROLLOVER_JOINING_DATE_REQUIRED';
  END IF;

  PERFORM 1
  FROM public.batches b
  WHERE b.id = v_request.selected_batch_id
    AND b.institute_id = v_request.institute_id
  FOR UPDATE;

  SELECT public.rollover_seat_availability(v_request.selected_batch_id, v_request.target_academic_year_id, v_request.id)
  INTO v_available;

  IF v_available IS NOT NULL AND v_available < 1 THEN
    RAISE EXCEPTION 'ROLLOVER_BATCH_FULL';
  END IF;

  UPDATE public.student_rollover_requests
  SET parent_confirmed_at = now(),
      parent_confirmed_by = v_profile.id,
      parent_locked_at = now(),
      admin_status = CASE WHEN admin_status = 'approved' THEN 'approved' ELSE 'ready' END,
      updated_at = now()
  WHERE id = v_request.id;

  RETURN jsonb_build_object('request_id', v_request.id, 'locked', true);
END;
$$;

REVOKE ALL ON FUNCTION public.confirm_parent_rollover(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.confirm_parent_rollover(uuid) TO authenticated;

-- =====================================================================
-- Parent + admin: read-only detail snapshot (RLS-safe for parents)
-- =====================================================================
CREATE FUNCTION public.get_rollover_request_detail(p_request_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_request public.student_rollover_requests%ROWTYPE;
  v_profile public.profiles%ROWTYPE;
  v_role text;
  v_result jsonb;
BEGIN
  SELECT * INTO v_request FROM public.student_rollover_requests WHERE id = p_request_id;
  IF v_request.id IS NULL THEN
    RAISE EXCEPTION 'ROLLOVER_REQUEST_NOT_FOUND';
  END IF;

  SELECT * INTO v_profile
  FROM public.profiles p
  WHERE p.id = auth.uid() AND p.is_active IS TRUE;
  SELECT COALESCE(NULLIF(btrim(p.role), ''), r.name) INTO v_role
  FROM public.profiles p LEFT JOIN public.roles r ON r.id = p.role_id
  WHERE p.id = auth.uid();

  IF v_profile.id IS NULL THEN
    RAISE EXCEPTION 'ROLLOVER_UNAUTHORIZED';
  END IF;

  IF v_role IN ('admin', 'Super Admin', 'Institute Admin') THEN
    IF v_profile.institute_id <> v_request.institute_id THEN
      RAISE EXCEPTION 'ROLLOVER_UNAUTHORIZED';
    END IF;
  ELSIF v_role = 'Parent' THEN
    IF NOT EXISTS (
      SELECT 1
      FROM public.parents pa
      JOIN public.student_parent_links spl ON spl.parent_id = pa.id AND spl.institute_id = pa.institute_id
      WHERE pa.profile_id = v_profile.id
        AND pa.institute_id = v_request.institute_id
        AND pa.is_active IS TRUE
        AND spl.student_id = v_request.student_id
    ) THEN
      RAISE EXCEPTION 'ROLLOVER_UNAUTHORIZED';
    END IF;
  ELSE
    RAISE EXCEPTION 'ROLLOVER_UNAUTHORIZED';
  END IF;

  SELECT jsonb_build_object(
    'request_id', v_request.id,
    'institute_id', v_request.institute_id,
    'branch_id', v_request.branch_id,
    'student_id', v_request.student_id,
    'student_name', (SELECT s.name FROM public.students s WHERE s.id = v_request.student_id),
    'admission_no', (SELECT s.admission_no FROM public.students s WHERE s.id = v_request.student_id),
    'source_year_id', v_request.source_academic_year_id,
    'source_year_name', (SELECT ay.name FROM public.academic_years ay WHERE ay.id = v_request.source_academic_year_id),
    'target_year_id', v_request.target_academic_year_id,
    'target_year_name', (SELECT ay.name FROM public.academic_years ay WHERE ay.id = v_request.target_academic_year_id),
    'target_year_start', (SELECT ay.start_date FROM public.academic_years ay WHERE ay.id = v_request.target_academic_year_id),
    'proposed_class_id', v_request.proposed_class_id,
    'proposed_class_name', (SELECT c.class_name FROM public.academic_classes c WHERE c.id = v_request.proposed_class_id),
    'proposed_board_id', v_request.proposed_board_id,
    'proposed_board_name', (SELECT b.name FROM public.boards b WHERE b.id = v_request.proposed_board_id),
    'parent_response', v_request.parent_response,
    'joining_type', v_request.joining_type,
    'expected_joining_date', v_request.expected_joining_date,
    'selected_batch_id', v_request.selected_batch_id,
    'selected_batch_name', (SELECT b.name FROM public.batches b WHERE b.id = v_request.selected_batch_id),
    'selected_batch_subject', (SELECT s.subject_name FROM public.subjects s JOIN public.batches b ON b.subject_id = s.id WHERE b.id = v_request.selected_batch_id),
    'parent_notes', v_request.parent_notes,
    'parent_confirmed_at', v_request.parent_confirmed_at,
    'parent_locked_at', v_request.parent_locked_at,
    'admin_status', v_request.admin_status,
    'admin_notes', v_request.admin_notes,
    'finalized_assignment_id', v_request.finalized_assignment_id,
    'finalized_at', v_request.finalized_at,
    'response_deadline', v_request.response_deadline,
    'created_at', v_request.created_at,
    'is_locked', v_request.parent_locked_at IS NOT NULL,
    'seats_available', public.rollover_seat_availability(v_request.selected_batch_id, v_request.target_academic_year_id, v_request.id)
  ) INTO v_result;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.get_rollover_request_detail(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_rollover_request_detail(uuid) TO authenticated;

-- =====================================================================
-- Admin: override the parent-chosen batch (audited, capacity-safe)
-- =====================================================================
CREATE FUNCTION public.admin_override_rollover_batch(
  p_request_id uuid,
  p_new_batch_id uuid,
  p_reason text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_request public.student_rollover_requests%ROWTYPE;
  v_profile public.profiles%ROWTYPE;
  v_institute_id uuid;
  v_previous_batch_id uuid;
  v_valid boolean;
BEGIN
  SELECT * INTO v_profile
  FROM public.profiles p
  WHERE p.id = auth.uid() AND p.is_active IS TRUE;

  IF v_profile.id IS NULL
     OR NOT public.learning_planner_admin_scope(v_profile.institute_id, v_profile.branch_id) THEN
    RAISE EXCEPTION 'ROLLOVER_UNAUTHORIZED';
  END IF;
  v_institute_id := v_profile.institute_id;

  SELECT * INTO v_request
  FROM public.student_rollover_requests
  WHERE id = p_request_id
  FOR UPDATE;
  IF v_request.id IS NULL OR v_request.institute_id <> v_institute_id THEN
    RAISE EXCEPTION 'ROLLOVER_REQUEST_NOT_FOUND';
  END IF;

  IF v_request.admin_status IN ('completed', 'cancelled', 'rejected') THEN
    RAISE EXCEPTION 'ROLLOVER_REQUEST_CLOSED';
  END IF;

  IF NULLIF(btrim(p_reason), '') IS NULL OR char_length(btrim(p_reason)) < 5 THEN
    RAISE EXCEPTION 'ROLLOVER_OVERRIDE_REASON_REQUIRED';
  END IF;

  IF p_new_batch_id = v_request.selected_batch_id THEN
    RAISE EXCEPTION 'ROLLOVER_BATCH_UNCHANGED';
  END IF;

  SELECT public.rollover_batch_is_valid(v_request.id, p_new_batch_id, true)
  INTO v_valid;
  IF NOT v_valid THEN
    RAISE EXCEPTION 'ROLLOVER_BATCH_INVALID_OR_FULL';
  END IF;

  v_previous_batch_id := v_request.selected_batch_id;

  INSERT INTO public.student_rollover_batch_change_history (
    institute_id,
    rollover_request_id,
    previous_batch_id,
    new_batch_id,
    reason,
    changed_by
  ) VALUES (
    v_institute_id,
    v_request.id,
    v_previous_batch_id,
    p_new_batch_id,
    btrim(p_reason),
    v_profile.id
  );

  UPDATE public.student_rollover_requests
  SET selected_batch_id = p_new_batch_id,
      admin_notes = COALESCE(admin_notes || E'\n', '') || '[OVERRIDE] ' || btrim(p_reason),
      admin_status = CASE WHEN admin_status = 'pending' THEN 'ready' ELSE admin_status END,
      updated_at = now()
  WHERE id = v_request.id;

  RETURN jsonb_build_object('request_id', v_request.id, 'new_batch_id', p_new_batch_id);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_override_rollover_batch(uuid, uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_override_rollover_batch(uuid, uuid, text) TO authenticated;

-- =====================================================================
-- Admin: resolve a request without creating an assignment
-- (rejected = not continuing, cancelled = mistake/duplicate)
-- =====================================================================
CREATE FUNCTION public.resolve_rollover_request(
  p_request_id uuid,
  p_admin_status text,
  p_notes text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_request public.student_rollover_requests%ROWTYPE;
  v_profile public.profiles%ROWTYPE;
  v_institute_id uuid;
BEGIN
  SELECT * INTO v_profile
  FROM public.profiles p
  WHERE p.id = auth.uid() AND p.is_active IS TRUE;

  IF v_profile.id IS NULL
     OR NOT public.learning_planner_admin_scope(v_profile.institute_id, v_profile.branch_id) THEN
    RAISE EXCEPTION 'ROLLOVER_UNAUTHORIZED';
  END IF;
  v_institute_id := v_profile.institute_id;

  SELECT * INTO v_request FROM public.student_rollover_requests WHERE id = p_request_id;
  IF v_request.id IS NULL OR v_request.institute_id <> v_institute_id THEN
    RAISE EXCEPTION 'ROLLOVER_REQUEST_NOT_FOUND';
  END IF;

  IF v_request.admin_status IN ('completed', 'cancelled', 'rejected') THEN
    RAISE EXCEPTION 'ROLLOVER_REQUEST_CLOSED';
  END IF;

  IF p_admin_status NOT IN ('rejected', 'cancelled') THEN
    RAISE EXCEPTION 'ROLLOVER_RESOLUTION_INVALID';
  END IF;

  IF NULLIF(btrim(p_notes), '') IS NULL OR char_length(btrim(p_notes)) < 5 THEN
    RAISE EXCEPTION 'ROLLOVER_RESOLUTION_NOTES_REQUIRED';
  END IF;

  UPDATE public.student_rollover_requests
  SET admin_status = p_admin_status,
      admin_notes = COALESCE(admin_notes || E'\n', '') || btrim(p_notes),
      updated_at = now()
  WHERE id = v_request.id;

  RETURN jsonb_build_object('request_id', v_request.id, 'admin_status', p_admin_status);
END;
$$;

REVOKE ALL ON FUNCTION public.resolve_rollover_request(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.resolve_rollover_request(uuid, text, text) TO authenticated;

-- Admin: approve a request for finalization (used when parent confirmation is
-- not available but the administration decides to proceed).
CREATE FUNCTION public.approve_rollover_request(
  p_request_id uuid,
  p_notes text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_request public.student_rollover_requests%ROWTYPE;
  v_profile public.profiles%ROWTYPE;
  v_institute_id uuid;
BEGIN
  SELECT * INTO v_profile
  FROM public.profiles p
  WHERE p.id = auth.uid() AND p.is_active IS TRUE;

  IF v_profile.id IS NULL
     OR NOT public.learning_planner_admin_scope(v_profile.institute_id, v_profile.branch_id) THEN
    RAISE EXCEPTION 'ROLLOVER_UNAUTHORIZED';
  END IF;
  v_institute_id := v_profile.institute_id;

  SELECT * INTO v_request FROM public.student_rollover_requests WHERE id = p_request_id;
  IF v_request.id IS NULL OR v_request.institute_id <> v_institute_id THEN
    RAISE EXCEPTION 'ROLLOVER_REQUEST_NOT_FOUND';
  END IF;

  IF v_request.admin_status IN ('completed', 'cancelled', 'rejected') THEN
    RAISE EXCEPTION 'ROLLOVER_REQUEST_CLOSED';
  END IF;

  IF v_request.parent_response <> 'continuing' THEN
    RAISE EXCEPTION 'ROLLOVER_RESPONSE_NOT_CONTINUING';
  END IF;

  IF NULLIF(btrim(p_notes), '') IS NULL OR char_length(btrim(p_notes)) < 5 THEN
    RAISE EXCEPTION 'ROLLOVER_RESOLUTION_NOTES_REQUIRED';
  END IF;

  UPDATE public.student_rollover_requests
  SET admin_status = 'approved',
      admin_notes = COALESCE(admin_notes || E'\n', '') || '[APPROVED] ' || btrim(p_notes),
      updated_at = now()
  WHERE id = v_request.id;

  RETURN jsonb_build_object('request_id', v_request.id, 'admin_status', 'approved');
END;
$$;

REVOKE ALL ON FUNCTION public.approve_rollover_request(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.approve_rollover_request(uuid, text) TO authenticated;

-- =====================================================================
-- Admin: finalize the rollover (creates the next-year assignment)
-- =====================================================================
CREATE FUNCTION public.finalize_rollover(
  p_request_id uuid,
  p_remarks text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_request public.student_rollover_requests%ROWTYPE;
  v_profile public.profiles%ROWTYPE;
  v_institute_id uuid;
  v_source public.student_assignments%ROWTYPE;
  v_target_start date;
  v_effective_from date;
  v_promotion_type text := 'Promoted';
  v_result jsonb;
  v_assignment_id uuid;
BEGIN
  SELECT * INTO v_profile
  FROM public.profiles p
  WHERE p.id = auth.uid() AND p.is_active IS TRUE;

  IF v_profile.id IS NULL
     OR NOT public.learning_planner_admin_scope(v_profile.institute_id, v_profile.branch_id) THEN
    RAISE EXCEPTION 'ROLLOVER_UNAUTHORIZED';
  END IF;
  v_institute_id := v_profile.institute_id;

  SELECT * INTO v_request
  FROM public.student_rollover_requests
  WHERE id = p_request_id
  FOR UPDATE;
  IF v_request.id IS NULL OR v_request.institute_id <> v_institute_id THEN
    RAISE EXCEPTION 'ROLLOVER_REQUEST_NOT_FOUND';
  END IF;

  -- Idempotent re-finalization: a completed request returns its assignment
  -- instead of being treated as closed (must be checked before the status gate).
  IF v_request.finalized_assignment_id IS NOT NULL THEN
    RETURN jsonb_build_object('request_id', v_request.id, 'already_finalized', true,
                              'assignment_id', v_request.finalized_assignment_id);
  END IF;

  IF v_request.admin_status IN ('completed', 'cancelled', 'rejected') THEN
    RAISE EXCEPTION 'ROLLOVER_REQUEST_CLOSED';
  END IF;

  -- Only parent-confirmed continuations (or admin-approved) may be finalized.
  IF NOT (
    v_request.parent_locked_at IS NOT NULL
    OR v_request.admin_status = 'approved'
  ) THEN
    RAISE EXCEPTION 'ROLLOVER_FINALIZE_REQUIRES_CONFIRMATION';
  END IF;

  IF v_request.selected_batch_id IS NULL THEN
    RAISE EXCEPTION 'ROLLOVER_BATCH_REQUIRED';
  END IF;

  IF NOT public.rollover_batch_is_valid(v_request.id, v_request.selected_batch_id, true) THEN
    RAISE EXCEPTION 'ROLLOVER_BATCH_INVALID_OR_FULL';
  END IF;

  SELECT * INTO v_source
  FROM public.student_assignments sa
  WHERE sa.id = v_request.source_assignment_id;

  SELECT start_date INTO v_target_start
  FROM public.academic_years ay
  WHERE ay.id = v_request.target_academic_year_id;

  IF v_request.joining_type = 'delayed' THEN
    v_effective_from := v_request.expected_joining_date;
  ELSE
    v_effective_from := v_target_start;
  END IF;

  SELECT public.change_student_assignment(
    v_request.student_id,
    v_request.target_academic_year_id,
    v_source.school_id,
    v_request.proposed_board_id,
    v_request.proposed_class_id,
    v_request.selected_batch_id,
    v_effective_from,
    v_promotion_type,
    p_remarks
  ) INTO v_result;

  v_assignment_id := (v_result->>'assignment_id')::uuid;

  UPDATE public.student_rollover_requests
  SET admin_status = 'completed',
      finalized_assignment_id = v_assignment_id,
      finalized_at = now(),
      finalized_by = v_profile.id,
      admin_notes = COALESCE(admin_notes || E'\n', '') || 'Finalized on ' || to_char(now(), 'YYYY-MM-DD'),
      updated_at = now()
  WHERE id = v_request.id;

  -- Delayed joining: model the gap from the start of the target year.
  IF v_request.joining_type = 'delayed'
     AND v_effective_from > v_target_start THEN
    INSERT INTO public.student_enrollment_breaks (
      institute_id,
      branch_id,
      student_id,
      student_assignment_id,
      academic_year_id,
      batch_id,
      break_from,
      break_to,
      status,
      reason,
      fee_treatment,
      fee_treatment_notes,
      source,
      rollover_request_id,
      created_by
    ) VALUES (
      v_institute_id,
      v_request.branch_id,
      v_request.student_id,
      v_assignment_id,
      v_request.target_academic_year_id,
      v_request.selected_batch_id,
      v_target_start,
      v_effective_from - 1,
      'scheduled',
      'Delayed joining confirmed by parent on ' || to_char(v_request.parent_confirmed_at, 'YYYY-MM-DD'),
      'waived',
      'Delayed joining per parent rollover confirmation',
      'rollover',
      v_request.id,
      v_profile.id
    );
  END IF;

  RETURN jsonb_build_object('request_id', v_request.id, 'assignment_id', v_assignment_id,
                            'effective_from', v_effective_from, 'already_finalized', false);
END;
$$;

REVOKE ALL ON FUNCTION public.finalize_rollover(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.finalize_rollover(uuid, text) TO authenticated;

-- =====================================================================
-- Admin: manual enrollment breaks
-- =====================================================================
CREATE FUNCTION public.create_enrollment_break(
  p_student_id uuid,
  p_academic_year_id uuid,
  p_batch_id uuid,
  p_break_from date,
  p_break_to date,
  p_reason text,
  p_fee_treatment text,
  p_fee_treatment_notes text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_profile public.profiles%ROWTYPE;
  v_institute_id uuid;
  v_assignment public.student_assignments%ROWTYPE;
  v_break_id uuid;
BEGIN
  SELECT * INTO v_profile
  FROM public.profiles p
  WHERE p.id = auth.uid() AND p.is_active IS TRUE;

  IF v_profile.id IS NULL
     OR NOT public.learning_planner_admin_scope(v_profile.institute_id, v_profile.branch_id) THEN
    RAISE EXCEPTION 'ROLLOVER_UNAUTHORIZED';
  END IF;
  v_institute_id := v_profile.institute_id;

  IF p_break_from IS NULL OR p_break_to IS NULL OR p_break_to < p_break_from THEN
    RAISE EXCEPTION 'ROLLOVER_BREAK_DATE_INVALID';
  END IF;

  IF NULLIF(btrim(p_reason), '') IS NULL THEN
    RAISE EXCEPTION 'ROLLOVER_BREAK_REASON_REQUIRED';
  END IF;

  IF p_fee_treatment IS NULL
     OR p_fee_treatment NOT IN ('normal', 'waived', 'partial', 'custom') THEN
    RAISE EXCEPTION 'ROLLOVER_BREAK_FEE_TREATMENT_INVALID';
  END IF;

  SELECT * INTO v_assignment
  FROM public.student_assignments sa
  WHERE sa.student_id = p_student_id
    AND sa.institute_id = v_institute_id
    AND sa.academic_year_id = p_academic_year_id
    AND sa.batch_id = p_batch_id
    AND sa.status = 'Current';

  IF v_assignment.id IS NULL THEN
    RAISE EXCEPTION 'ROLLOVER_BREAK_ASSIGNMENT_INVALID';
  END IF;

  IF p_break_from < v_assignment.effective_from
     OR (v_assignment.effective_to IS NOT NULL AND p_break_to > v_assignment.effective_to) THEN
    RAISE EXCEPTION 'ROLLOVER_BREAK_OUTSIDE_ASSIGNMENT';
  END IF;

  INSERT INTO public.student_enrollment_breaks (
    institute_id,
    branch_id,
    student_id,
    student_assignment_id,
    academic_year_id,
    batch_id,
    break_from,
    break_to,
    status,
    reason,
    fee_treatment,
    fee_treatment_notes,
    source,
    created_by
  ) VALUES (
    v_institute_id,
    (SELECT branch_id FROM public.batches b WHERE b.id = p_batch_id),
    p_student_id,
    v_assignment.id,
    p_academic_year_id,
    p_batch_id,
    p_break_from,
    p_break_to,
    'scheduled',
    btrim(p_reason),
    p_fee_treatment,
    NULLIF(btrim(p_fee_treatment_notes), ''),
    'manual',
    v_profile.id
  )
  RETURNING id INTO v_break_id;

  RETURN jsonb_build_object('break_id', v_break_id, 'status', 'scheduled');
END;
$$;

REVOKE ALL ON FUNCTION public.create_enrollment_break(uuid, uuid, uuid, date, date, text, text, text)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_enrollment_break(uuid, uuid, uuid, date, date, text, text, text)
  TO authenticated;

CREATE FUNCTION public.complete_enrollment_break(
  p_break_id uuid,
  p_actual_resumption_date date
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_break public.student_enrollment_breaks%ROWTYPE;
  v_profile public.profiles%ROWTYPE;
  v_institute_id uuid;
BEGIN
  SELECT * INTO v_profile
  FROM public.profiles p
  WHERE p.id = auth.uid() AND p.is_active IS TRUE;

  IF v_profile.id IS NULL
     OR NOT public.learning_planner_admin_scope(v_profile.institute_id, v_profile.branch_id) THEN
    RAISE EXCEPTION 'ROLLOVER_UNAUTHORIZED';
  END IF;
  v_institute_id := v_profile.institute_id;

  SELECT * INTO v_break
  FROM public.student_enrollment_breaks eb
  WHERE eb.id = p_break_id AND eb.institute_id = v_institute_id;

  IF v_break.id IS NULL THEN
    RAISE EXCEPTION 'ROLLOVER_BREAK_NOT_FOUND';
  END IF;

  IF v_break.status IN ('completed', 'cancelled') THEN
    RAISE EXCEPTION 'ROLLOVER_BREAK_CLOSED';
  END IF;

  IF p_actual_resumption_date IS NULL THEN
    p_actual_resumption_date := v_break.break_to + 1;
  END IF;

  IF p_actual_resumption_date < v_break.break_from THEN
    RAISE EXCEPTION 'ROLLOVER_BREAK_DATE_INVALID';
  END IF;

  UPDATE public.student_enrollment_breaks
  SET status = 'completed',
      actual_resumption_date = p_actual_resumption_date,
      completed_at = now(),
      updated_at = now()
  WHERE id = v_break.id;

  RETURN jsonb_build_object('break_id', v_break.id, 'status', 'completed',
                            'actual_resumption_date', p_actual_resumption_date);
END;
$$;

REVOKE ALL ON FUNCTION public.complete_enrollment_break(uuid, date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.complete_enrollment_break(uuid, date) TO authenticated;

CREATE FUNCTION public.cancel_enrollment_break(
  p_break_id uuid,
  p_reason text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_break public.student_enrollment_breaks%ROWTYPE;
  v_profile public.profiles%ROWTYPE;
  v_institute_id uuid;
BEGIN
  SELECT * INTO v_profile
  FROM public.profiles p
  WHERE p.id = auth.uid() AND p.is_active IS TRUE;

  IF v_profile.id IS NULL
     OR NOT public.learning_planner_admin_scope(v_profile.institute_id, v_profile.branch_id) THEN
    RAISE EXCEPTION 'ROLLOVER_UNAUTHORIZED';
  END IF;
  v_institute_id := v_profile.institute_id;

  SELECT * INTO v_break
  FROM public.student_enrollment_breaks eb
  WHERE eb.id = p_break_id AND eb.institute_id = v_institute_id;

  IF v_break.id IS NULL THEN
    RAISE EXCEPTION 'ROLLOVER_BREAK_NOT_FOUND';
  END IF;

  IF v_break.status IN ('completed', 'cancelled') THEN
    RAISE EXCEPTION 'ROLLOVER_BREAK_CLOSED';
  END IF;

  IF NULLIF(btrim(p_reason), '') IS NULL THEN
    RAISE EXCEPTION 'ROLLOVER_BREAK_REASON_REQUIRED';
  END IF;

  UPDATE public.student_enrollment_breaks
  SET status = 'cancelled',
      cancelled_at = now(),
      cancelled_reason = btrim(p_reason),
      updated_at = now()
  WHERE id = v_break.id;

  RETURN jsonb_build_object('break_id', v_break.id, 'status', 'cancelled');
END;
$$;

REVOKE ALL ON FUNCTION public.cancel_enrollment_break(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cancel_enrollment_break(uuid, text) TO authenticated;

-- =====================================================================
-- Attendance integration: assignment ids on break for a given day
-- =====================================================================
CREATE FUNCTION public.get_on_break_assignments(
  p_institute_id uuid,
  p_academic_year_id uuid,
  p_batch_id uuid,
  p_on_date date
)
RETURNS SETOF uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_profile public.profiles%ROWTYPE;
BEGIN
  SELECT * INTO v_profile
  FROM public.profiles p
  WHERE p.id = auth.uid() AND p.is_active IS TRUE;

  IF v_profile.id IS NULL
     OR NOT public.learning_planner_admin_scope(v_profile.institute_id, v_profile.branch_id) THEN
    RAISE EXCEPTION 'ATTENDANCE_UNAUTHORIZED';
  END IF;

  RETURN QUERY
  SELECT eb.student_assignment_id
  FROM public.student_enrollment_breaks eb
  WHERE eb.institute_id = p_institute_id
    AND eb.academic_year_id = p_academic_year_id
    AND eb.batch_id = p_batch_id
    AND eb.status IN ('scheduled', 'active')
    AND eb.break_from <= p_on_date
    AND eb.break_to >= p_on_date;
END;
$$;

REVOKE ALL ON FUNCTION public.get_on_break_assignments(uuid, uuid, uuid, date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_on_break_assignments(uuid, uuid, uuid, date) TO authenticated;

-- =====================================================================
-- Admin read helpers (RLS-safe list for the workspace)
-- =====================================================================
CREATE FUNCTION public.list_rollover_workspace(p_source_year_id uuid, p_target_year_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_profile public.profiles%ROWTYPE;
  v_institute_id uuid;
  v_results jsonb := '[]'::jsonb;
  v_row record;
BEGIN
  SELECT * INTO v_profile
  FROM public.profiles p
  WHERE p.id = auth.uid() AND p.is_active IS TRUE;

  IF v_profile.id IS NULL
     OR NOT public.learning_planner_admin_scope(v_profile.institute_id, v_profile.branch_id) THEN
    RAISE EXCEPTION 'ROLLOVER_UNAUTHORIZED';
  END IF;
  v_institute_id := v_profile.institute_id;

  FOR v_row IN
    SELECT rr.id, rr.student_id, s.name AS student_name, s.admission_no,
           c.class_name, rr.parent_response, rr.joining_type,
           rr.selected_batch_id, b.name AS selected_batch_name,
           rr.admin_status, rr.parent_locked_at, rr.parent_confirmed_at,
           rr.response_deadline, rr.parent_notes, rr.admin_notes, rr.created_at
    FROM public.student_rollover_requests rr
    JOIN public.students s ON s.id = rr.student_id AND s.institute_id = rr.institute_id
    JOIN public.academic_classes c ON c.id = rr.proposed_class_id AND c.institute_id = rr.institute_id
    LEFT JOIN public.batches b ON b.id = rr.selected_batch_id AND b.institute_id = rr.institute_id
    WHERE rr.institute_id = v_institute_id
      AND rr.source_academic_year_id = p_source_year_id
      AND rr.target_academic_year_id = p_target_year_id
    ORDER BY s.name
  LOOP
    v_results := v_results || jsonb_build_object(
      'request_id', v_row.id,
      'student_id', v_row.student_id,
      'student_name', v_row.student_name,
      'admission_no', v_row.admission_no,
      'proposed_class_name', v_row.class_name,
      'parent_response', v_row.parent_response,
      'joining_type', v_row.joining_type,
      'selected_batch_id', v_row.selected_batch_id,
      'selected_batch_name', v_row.selected_batch_name,
      'admin_status', v_row.admin_status,
      'parent_locked_at', v_row.parent_locked_at,
      'parent_confirmed_at', v_row.parent_confirmed_at,
      'response_deadline', v_row.response_deadline,
      'parent_notes', v_row.parent_notes,
      'admin_notes', v_row.admin_notes,
      'created_at', v_row.created_at,
      'is_locked', v_row.parent_locked_at IS NOT NULL
    );
  END LOOP;

  RETURN v_results;
END;
$$;

REVOKE ALL ON FUNCTION public.list_rollover_workspace(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_rollover_workspace(uuid, uuid) TO authenticated;

-- =====================================================================
-- Parent read helpers (RLS-safe list for the portal)
-- =====================================================================
CREATE FUNCTION public.list_parent_rollover_requests()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_profile public.profiles%ROWTYPE;
  v_results jsonb := '[]'::jsonb;
  v_row record;
BEGIN
  SELECT * INTO v_profile
  FROM public.profiles p
  WHERE p.id = auth.uid() AND p.is_active IS TRUE;

  IF v_profile.id IS NULL THEN
    RAISE EXCEPTION 'ROLLOVER_UNAUTHORIZED';
  END IF;

  FOR v_row IN
    SELECT rr.id, rr.student_id, rr.target_academic_year_id, rr.parent_response,
           rr.joining_type, rr.expected_joining_date, rr.admin_status,
           rr.parent_locked_at, rr.parent_confirmed_at, rr.response_deadline,
           rr.parent_notes, rr.admin_notes, rr.created_at,
           s.name AS student_name, s.admission_no,
           (SELECT ay.name FROM public.academic_years ay WHERE ay.id = rr.source_academic_year_id) AS source_year_name,
           (SELECT ay.name FROM public.academic_years ay WHERE ay.id = rr.target_academic_year_id) AS target_year_name,
           (SELECT ay.start_date FROM public.academic_years ay WHERE ay.id = rr.target_academic_year_id) AS target_year_start,
           (SELECT c.class_name FROM public.academic_classes c WHERE c.id = rr.proposed_class_id) AS proposed_class_name,
           (SELECT b.name FROM public.batches b WHERE b.id = rr.selected_batch_id) AS selected_batch_name,
           (SELECT s.subject_name FROM public.subjects s JOIN public.batches b ON b.subject_id = s.id WHERE b.id = rr.selected_batch_id) AS selected_batch_subject
    FROM public.student_rollover_requests rr
    JOIN public.parents p ON p.institute_id = rr.institute_id AND p.profile_id = v_profile.id AND p.is_active IS TRUE
    JOIN public.student_parent_links spl ON spl.parent_id = p.id AND spl.institute_id = rr.institute_id AND spl.student_id = rr.student_id
    JOIN public.students s ON s.id = rr.student_id AND s.institute_id = rr.institute_id
    ORDER BY rr.created_at DESC
  LOOP
    v_results := v_results || jsonb_build_object(
      'request_id', v_row.id,
      'student_id', v_row.student_id,
      'student_name', v_row.student_name,
      'admission_no', v_row.admission_no,
      'source_year_name', v_row.source_year_name,
      'target_year_name', v_row.target_year_name,
      'target_year_start', v_row.target_year_start,
      'proposed_class_name', v_row.proposed_class_name,
      'parent_response', v_row.parent_response,
      'joining_type', v_row.joining_type,
      'expected_joining_date', v_row.expected_joining_date,
      'selected_batch_id', v_row.selected_batch_id,
      'selected_batch_name', v_row.selected_batch_name,
      'selected_batch_subject', v_row.selected_batch_subject,
      'admin_status', v_row.admin_status,
      'parent_locked_at', v_row.parent_locked_at,
      'parent_confirmed_at', v_row.parent_confirmed_at,
      'response_deadline', v_row.response_deadline,
      'parent_notes', v_row.parent_notes,
      'admin_notes', v_row.admin_notes,
      'created_at', v_row.created_at,
      'is_locked', v_row.parent_locked_at IS NOT NULL
    );
  END LOOP;

  RETURN v_results;
END;
$$;

REVOKE ALL ON FUNCTION public.list_parent_rollover_requests() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_parent_rollover_requests() TO authenticated;

CREATE FUNCTION public.list_parent_enrollment_breaks()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_profile public.profiles%ROWTYPE;
  v_results jsonb := '[]'::jsonb;
  v_row record;
BEGIN
  SELECT * INTO v_profile
  FROM public.profiles p
  WHERE p.id = auth.uid() AND p.is_active IS TRUE;

  IF v_profile.id IS NULL THEN
    RAISE EXCEPTION 'ROLLOVER_UNAUTHORIZED';
  END IF;

  FOR v_row IN
    SELECT eb.id, eb.student_id, eb.break_from, eb.break_to, eb.status,
           eb.reason, eb.fee_treatment, eb.actual_resumption_date, eb.created_at,
           s.name AS student_name, s.admission_no,
           (SELECT ay.name FROM public.academic_years ay WHERE ay.id = eb.academic_year_id) AS year_name,
           (SELECT b.name FROM public.batches b WHERE b.id = eb.batch_id) AS batch_name
    FROM public.student_enrollment_breaks eb
    JOIN public.parents p ON p.institute_id = eb.institute_id AND p.profile_id = v_profile.id AND p.is_active IS TRUE
    JOIN public.student_parent_links spl ON spl.parent_id = p.id AND spl.institute_id = eb.institute_id AND spl.student_id = eb.student_id
    JOIN public.students s ON s.id = eb.student_id AND s.institute_id = eb.institute_id
    ORDER BY eb.break_from DESC
  LOOP
    v_results := v_results || jsonb_build_object(
      'break_id', v_row.id,
      'student_id', v_row.student_id,
      'student_name', v_row.student_name,
      'admission_no', v_row.admission_no,
      'year_name', v_row.year_name,
      'batch_name', v_row.batch_name,
      'break_from', v_row.break_from,
      'break_to', v_row.break_to,
      'status', v_row.status,
      'reason', v_row.reason,
      'fee_treatment', v_row.fee_treatment,
      'actual_resumption_date', v_row.actual_resumption_date,
      'created_at', v_row.created_at
    );
  END LOOP;

  RETURN v_results;
END;
$$;

REVOKE ALL ON FUNCTION public.list_parent_enrollment_breaks() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_parent_enrollment_breaks() TO authenticated;

CREATE FUNCTION public.list_admin_enrollment_breaks()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_profile public.profiles%ROWTYPE;
  v_institute_id uuid;
  v_results jsonb := '[]'::jsonb;
  v_row record;
BEGIN
  SELECT * INTO v_profile
  FROM public.profiles p
  WHERE p.id = auth.uid() AND p.is_active IS TRUE;

  IF v_profile.id IS NULL
     OR NOT public.learning_planner_admin_scope(v_profile.institute_id, v_profile.branch_id) THEN
    RAISE EXCEPTION 'ROLLOVER_UNAUTHORIZED';
  END IF;
  v_institute_id := v_profile.institute_id;

  FOR v_row IN
    SELECT eb.id, eb.student_id, eb.break_from, eb.break_to, eb.status,
           eb.reason, eb.fee_treatment, eb.fee_treatment_notes, eb.source,
           eb.rollover_request_id, eb.actual_resumption_date, eb.completed_at,
           eb.cancelled_at, eb.cancelled_reason, eb.created_at,
           s.name AS student_name, s.admission_no,
           (SELECT ay.name FROM public.academic_years ay WHERE ay.id = eb.academic_year_id) AS year_name,
           (SELECT b.name FROM public.batches b WHERE b.id = eb.batch_id) AS batch_name
    FROM public.student_enrollment_breaks eb
    JOIN public.students s ON s.id = eb.student_id AND s.institute_id = eb.institute_id
    WHERE eb.institute_id = v_institute_id
    ORDER BY eb.break_from DESC
  LOOP
    v_results := v_results || jsonb_build_object(
      'break_id', v_row.id,
      'student_id', v_row.student_id,
      'student_name', v_row.student_name,
      'admission_no', v_row.admission_no,
      'year_name', v_row.year_name,
      'batch_name', v_row.batch_name,
      'break_from', v_row.break_from,
      'break_to', v_row.break_to,
      'status', v_row.status,
      'reason', v_row.reason,
      'fee_treatment', v_row.fee_treatment,
      'fee_treatment_notes', v_row.fee_treatment_notes,
      'source', v_row.source,
      'rollover_request_id', v_row.rollover_request_id,
      'actual_resumption_date', v_row.actual_resumption_date,
      'completed_at', v_row.completed_at,
      'cancelled_at', v_row.cancelled_at,
      'cancelled_reason', v_row.cancelled_reason,
      'created_at', v_row.created_at
    );
  END LOOP;

  RETURN v_results;
END;
$$;

REVOKE ALL ON FUNCTION public.list_admin_enrollment_breaks() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_admin_enrollment_breaks() TO authenticated;

COMMIT;