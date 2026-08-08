BEGIN;

CREATE EXTENSION IF NOT EXISTS btree_gist WITH SCHEMA extensions;

ALTER TABLE public.academic_years
  ADD CONSTRAINT academic_years_id_institute_id_key UNIQUE (id, institute_id);
ALTER TABLE public.schools
  ADD CONSTRAINT schools_id_institute_id_key UNIQUE (id, institute_id);
ALTER TABLE public.boards
  ADD CONSTRAINT boards_id_institute_id_key UNIQUE (id, institute_id);
ALTER TABLE public.academic_classes
  ADD CONSTRAINT academic_classes_id_institute_id_key UNIQUE (id, institute_id);
ALTER TABLE public.batches
  ADD CONSTRAINT batches_id_institute_board_class_key
  UNIQUE (id, institute_id, board_id, class_id);

CREATE TABLE public.student_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institute_id uuid NOT NULL,
  student_id uuid NOT NULL,
  academic_year_id uuid NOT NULL,
  school_id uuid NOT NULL,
  board_id uuid NOT NULL,
  class_id uuid NOT NULL,
  batch_id uuid NOT NULL,
  effective_from date NOT NULL,
  effective_to date,
  status text NOT NULL,
  promotion_type text NOT NULL,
  remarks text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT student_assignments_status_check
    CHECK (status IN ('Current', 'Completed')),
  CONSTRAINT student_assignments_promotion_type_check
    CHECK (promotion_type IN (
      'New Admission',
      'Promoted',
      'Batch Transfer',
      'School Transfer',
      'Readmission'
    )),
  CONSTRAINT student_assignments_date_check
    CHECK (effective_to IS NULL OR effective_to >= effective_from),
  CONSTRAINT student_assignments_status_date_check
    CHECK (
      (status = 'Current' AND effective_to IS NULL)
      OR (status = 'Completed' AND effective_to IS NOT NULL)
    ),
  CONSTRAINT student_assignments_institute_fkey
    FOREIGN KEY (institute_id)
    REFERENCES public.institutes (id)
    ON DELETE RESTRICT,
  CONSTRAINT student_assignments_student_fkey
    FOREIGN KEY (student_id, institute_id)
    REFERENCES public.students (id, institute_id)
    ON DELETE RESTRICT,
  CONSTRAINT student_assignments_academic_year_fkey
    FOREIGN KEY (academic_year_id, institute_id)
    REFERENCES public.academic_years (id, institute_id)
    ON DELETE RESTRICT,
  CONSTRAINT student_assignments_school_fkey
    FOREIGN KEY (school_id, institute_id)
    REFERENCES public.schools (id, institute_id)
    ON DELETE RESTRICT,
  CONSTRAINT student_assignments_board_fkey
    FOREIGN KEY (board_id, institute_id)
    REFERENCES public.boards (id, institute_id)
    ON DELETE RESTRICT,
  CONSTRAINT student_assignments_class_fkey
    FOREIGN KEY (class_id, institute_id)
    REFERENCES public.academic_classes (id, institute_id)
    ON DELETE RESTRICT,
  CONSTRAINT student_assignments_batch_compatibility_fkey
    FOREIGN KEY (batch_id, institute_id, board_id, class_id)
    REFERENCES public.batches (id, institute_id, board_id, class_id)
    ON DELETE RESTRICT,
  CONSTRAINT student_assignments_no_overlap
    EXCLUDE USING gist (
      student_id WITH =,
      daterange(effective_from, COALESCE(effective_to, 'infinity'::date), '[]') WITH &&
    )
);

CREATE UNIQUE INDEX student_assignments_one_open_per_student_idx
  ON public.student_assignments (student_id)
  WHERE effective_to IS NULL;
CREATE INDEX student_assignments_institute_idx
  ON public.student_assignments (institute_id);
CREATE INDEX student_assignments_student_history_idx
  ON public.student_assignments (student_id, effective_from DESC);
CREATE INDEX student_assignments_academic_year_idx
  ON public.student_assignments (academic_year_id);
CREATE INDEX student_assignments_school_idx
  ON public.student_assignments (school_id);
CREATE INDEX student_assignments_board_idx
  ON public.student_assignments (board_id);
CREATE INDEX student_assignments_class_idx
  ON public.student_assignments (class_id);
CREATE INDEX student_assignments_batch_idx
  ON public.student_assignments (batch_id);

ALTER TABLE public.student_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY student_assignments_admin_select
ON public.student_assignments
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    LEFT JOIN public.roles r ON r.id = p.role_id
    WHERE p.id = (SELECT auth.uid())
      AND p.is_active IS TRUE
      AND p.institute_id = student_assignments.institute_id
      AND COALESCE(NULLIF(btrim(p.role), ''), r.name)
        IN ('admin', 'Super Admin', 'Institute Admin')
  )
);

REVOKE ALL ON TABLE public.student_assignments FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.student_assignments TO authenticated;

CREATE FUNCTION public.change_student_assignment(
  p_student_id uuid,
  p_academic_year_id uuid,
  p_school_id uuid,
  p_board_id uuid,
  p_class_id uuid,
  p_batch_id uuid,
  p_effective_from date,
  p_promotion_type text,
  p_remarks text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_institute_id uuid;
  v_role text;
  v_current public.student_assignments%ROWTYPE;
  v_new_id uuid;
  v_had_assignment boolean;
BEGIN
  SELECT p.institute_id, COALESCE(NULLIF(btrim(p.role), ''), r.name)
  INTO v_institute_id, v_role
  FROM public.profiles p
  LEFT JOIN public.roles r ON r.id = p.role_id
  WHERE p.id = auth.uid()
    AND p.is_active IS TRUE;

  IF v_institute_id IS NULL
     OR v_role NOT IN ('admin', 'Super Admin', 'Institute Admin') THEN
    RAISE EXCEPTION 'STUDENT_ASSIGNMENT_UNAUTHORIZED';
  END IF;

  IF p_effective_from IS NULL THEN
    RAISE EXCEPTION 'STUDENT_ASSIGNMENT_EFFECTIVE_FROM_REQUIRED';
  END IF;

  IF p_promotion_type NOT IN (
    'New Admission', 'Promoted', 'Batch Transfer', 'School Transfer', 'Readmission'
  ) THEN
    RAISE EXCEPTION 'STUDENT_ASSIGNMENT_PROMOTION_TYPE_INVALID';
  END IF;

  PERFORM 1
  FROM public.students s
  WHERE s.id = p_student_id
    AND s.institute_id = v_institute_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'STUDENT_ASSIGNMENT_STUDENT_INVALID';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.academic_years ay
    WHERE ay.id = p_academic_year_id
      AND ay.institute_id = v_institute_id
      AND ay.is_active IS TRUE
  ) THEN
    RAISE EXCEPTION 'STUDENT_ASSIGNMENT_ACADEMIC_YEAR_INVALID';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.schools s
    WHERE s.id = p_school_id
      AND s.institute_id = v_institute_id
      AND s.is_active IS TRUE
  ) THEN
    RAISE EXCEPTION 'STUDENT_ASSIGNMENT_SCHOOL_INVALID';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.boards b
    WHERE b.id = p_board_id
      AND b.institute_id = v_institute_id
  ) THEN
    RAISE EXCEPTION 'STUDENT_ASSIGNMENT_BOARD_INVALID';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.academic_classes c
    WHERE c.id = p_class_id
      AND c.institute_id = v_institute_id
  ) THEN
    RAISE EXCEPTION 'STUDENT_ASSIGNMENT_CLASS_INVALID';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.batches b
    WHERE b.id = p_batch_id
      AND b.institute_id = v_institute_id
      AND b.board_id = p_board_id
      AND b.class_id = p_class_id
      AND b.board_id IS NOT NULL
      AND b.class_id IS NOT NULL
      AND b.is_active IS TRUE
  ) THEN
    RAISE EXCEPTION 'STUDENT_ASSIGNMENT_BATCH_INCOMPATIBLE';
  END IF;

  SELECT * INTO v_current
  FROM public.student_assignments sa
  WHERE sa.student_id = p_student_id
    AND sa.institute_id = v_institute_id
    AND sa.status = 'Current'
    AND sa.effective_to IS NULL
  FOR UPDATE;

  SELECT EXISTS (
    SELECT 1 FROM public.student_assignments sa
    WHERE sa.student_id = p_student_id
      AND sa.institute_id = v_institute_id
  ) INTO v_had_assignment;

  IF v_current.id IS NOT NULL THEN
    IF p_effective_from <= v_current.effective_from THEN
      RAISE EXCEPTION 'STUDENT_ASSIGNMENT_EFFECTIVE_FROM_NOT_LATER';
    END IF;

    UPDATE public.student_assignments
    SET effective_to = p_effective_from - 1,
        status = 'Completed',
        updated_at = now()
    WHERE id = v_current.id;
  END IF;

  INSERT INTO public.student_assignments (
    institute_id,
    student_id,
    academic_year_id,
    school_id,
    board_id,
    class_id,
    batch_id,
    effective_from,
    effective_to,
    status,
    promotion_type,
    remarks
  ) VALUES (
    v_institute_id,
    p_student_id,
    p_academic_year_id,
    p_school_id,
    p_board_id,
    p_class_id,
    p_batch_id,
    p_effective_from,
    NULL,
    'Current',
    p_promotion_type,
    NULLIF(btrim(p_remarks), '')
  )
  RETURNING id INTO v_new_id;

  RETURN jsonb_build_object(
    'assignment_id', v_new_id,
    'previous_assignment_id', v_current.id,
    'operation', CASE WHEN v_had_assignment THEN 'changed' ELSE 'created' END
  );
EXCEPTION
  WHEN exclusion_violation THEN
    RAISE EXCEPTION 'STUDENT_ASSIGNMENT_OVERLAP';
  WHEN unique_violation THEN
    RAISE EXCEPTION 'STUDENT_ASSIGNMENT_CURRENT_CONFLICT';
END;
$$;

REVOKE ALL ON FUNCTION public.change_student_assignment(
  uuid, uuid, uuid, uuid, uuid, uuid, date, text, text
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.change_student_assignment(
  uuid, uuid, uuid, uuid, uuid, uuid, date, text, text
) TO authenticated;

COMMIT;
