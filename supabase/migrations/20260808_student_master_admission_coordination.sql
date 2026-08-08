BEGIN;

ALTER TABLE public.students
ADD COLUMN mother_name text;

CREATE OR REPLACE FUNCTION public.create_student_admission_foundation(
  p_academic_year_id uuid,
  p_name text,
  p_mother_name text,
  p_gender text,
  p_date_of_birth date,
  p_mobile text,
  p_email text,
  p_address text,
  p_admission_date date,
  p_status text,
  p_comments text,
  p_parent_id uuid,
  p_parent_name text,
  p_parent_mobile text,
  p_parent_email text,
  p_relationship text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_institute_id uuid;
  v_role text;
  v_student_id uuid;
  v_parent_id uuid;
  v_parent_created boolean := false;
  v_admission_no text;
  v_parent public.parents%ROWTYPE;
BEGIN
  SELECT p.institute_id, COALESCE(NULLIF(btrim(p.role), ''), r.name)
  INTO v_institute_id, v_role
  FROM public.profiles p
  LEFT JOIN public.roles r ON r.id = p.role_id
  WHERE p.id = auth.uid()
    AND p.is_active IS TRUE;

  IF v_institute_id IS NULL
     OR v_role NOT IN ('admin', 'Super Admin', 'Institute Admin') THEN
    RAISE EXCEPTION 'STUDENT_ADMISSION_UNAUTHORIZED';
  END IF;

  IF p_email IS NULL OR p_email <> lower(btrim(p_email))
     OR p_parent_email IS NULL OR p_parent_email <> lower(btrim(p_parent_email)) THEN
    RAISE EXCEPTION 'STUDENT_ADMISSION_EMAIL_NOT_NORMALIZED';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.academic_years ay
    WHERE ay.id = p_academic_year_id
      AND ay.institute_id = v_institute_id
      AND ay.is_active IS TRUE
  ) THEN
    RAISE EXCEPTION 'STUDENT_ADMISSION_ACADEMIC_YEAR_INVALID';
  END IF;

  IF p_parent_id IS NOT NULL THEN
    SELECT * INTO v_parent
    FROM public.parents p
    WHERE p.id = p_parent_id
      AND p.institute_id = v_institute_id
      AND p.email = p_parent_email;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'STUDENT_ADMISSION_PARENT_INVALID';
    END IF;
    v_parent_id := v_parent.id;
  ELSE
    IF EXISTS (
      SELECT 1 FROM public.parents p
      WHERE p.institute_id = v_institute_id
        AND p.email = p_parent_email
    ) THEN
      RAISE EXCEPTION 'STUDENT_ADMISSION_PARENT_CONFLICT';
    END IF;

    INSERT INTO public.parents (institute_id, name, mobile, email, is_active)
    VALUES (
      v_institute_id,
      btrim(p_parent_name),
      btrim(p_parent_mobile),
      p_parent_email,
      TRUE
    )
    RETURNING id INTO v_parent_id;
    v_parent_created := true;
  END IF;

  v_admission_no := public.next_student_admission_no(
    v_institute_id,
    p_academic_year_id
  );

  INSERT INTO public.students (
    institute_id,
    admission_no,
    name,
    mother_name,
    gender,
    date_of_birth,
    mobile,
    email,
    address,
    admission_date,
    status,
    comments
  )
  VALUES (
    v_institute_id,
    v_admission_no,
    btrim(p_name),
    NULLIF(btrim(p_mother_name), ''),
    p_gender,
    p_date_of_birth,
    btrim(p_mobile),
    p_email,
    NULLIF(btrim(p_address), ''),
    p_admission_date,
    p_status,
    NULLIF(btrim(p_comments), '')
  )
  RETURNING id INTO v_student_id;

  INSERT INTO public.student_parent_links (
    institute_id,
    student_id,
    parent_id,
    relationship
  )
  VALUES (
    v_institute_id,
    v_student_id,
    v_parent_id,
    btrim(p_relationship)
  );

  RETURN jsonb_build_object(
    'student_id', v_student_id,
    'parent_id', v_parent_id,
    'parent_created', v_parent_created,
    'admission_no', v_admission_no
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.compensate_student_admission_foundation(
  p_student_id uuid,
  p_parent_id uuid,
  p_parent_created boolean
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_institute_id uuid;
  v_role text;
BEGIN
  SELECT p.institute_id, COALESCE(NULLIF(btrim(p.role), ''), r.name)
  INTO v_institute_id, v_role
  FROM public.profiles p
  LEFT JOIN public.roles r ON r.id = p.role_id
  WHERE p.id = auth.uid()
    AND p.is_active IS TRUE;

  IF v_institute_id IS NULL
     OR v_role NOT IN ('admin', 'Super Admin', 'Institute Admin') THEN
    RAISE EXCEPTION 'STUDENT_ADMISSION_UNAUTHORIZED';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.students s
    WHERE s.id = p_student_id
      AND s.institute_id = v_institute_id
      AND s.profile_id IS NULL
  ) THEN
    RAISE EXCEPTION 'STUDENT_ADMISSION_COMPENSATION_TARGET_INVALID';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.student_parent_links spl
    WHERE spl.student_id = p_student_id
      AND spl.parent_id = p_parent_id
      AND spl.institute_id = v_institute_id
  ) THEN
    RAISE EXCEPTION 'STUDENT_ADMISSION_COMPENSATION_LINK_INVALID';
  END IF;

  DELETE FROM public.student_parent_links
  WHERE student_id = p_student_id
    AND parent_id = p_parent_id
    AND institute_id = v_institute_id;

  DELETE FROM public.students
  WHERE id = p_student_id
    AND institute_id = v_institute_id;

  IF p_parent_created THEN
    DELETE FROM public.parents p
    WHERE p.id = p_parent_id
      AND p.institute_id = v_institute_id
      AND p.profile_id IS NULL
      AND NOT EXISTS (
        SELECT 1 FROM public.student_parent_links spl
        WHERE spl.parent_id = p.id
          AND spl.institute_id = v_institute_id
      );
  END IF;

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.create_student_admission_foundation(
  uuid, text, text, text, date, text, text, text, date, text, text,
  uuid, text, text, text, text
) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.compensate_student_admission_foundation(
  uuid, uuid, boolean
) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.create_student_admission_foundation(
  uuid, text, text, text, date, text, text, text, date, text, text,
  uuid, text, text, text, text
) TO authenticated;
GRANT EXECUTE ON FUNCTION public.compensate_student_admission_foundation(
  uuid, uuid, boolean
) TO authenticated;

COMMIT;
