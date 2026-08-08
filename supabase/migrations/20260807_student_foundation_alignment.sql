BEGIN;

DO $$
DECLARE
  v_count integer;
BEGIN
  SELECT count(*) INTO v_count
  FROM public.institutes
  WHERE id = '0dc9fd67-b180-4396-a5d0-a505e26d2f07'
    AND name = 'Learning Is Fun'
    AND short_name IS NULL;

  IF v_count <> 1 THEN
    RAISE EXCEPTION 'Expected Learning Is Fun institute with NULL short_name was not found.';
  END IF;

  IF EXISTS (SELECT 1 FROM public.students)
     OR EXISTS (SELECT 1 FROM public.student_parents)
     OR EXISTS (SELECT 1 FROM public.student_addresses)
     OR EXISTS (SELECT 1 FROM public.student_batches) THEN
    RAISE EXCEPTION 'Student foundation tables are no longer empty; migration stopped.';
  END IF;
END;
$$;

UPDATE public.institutes
SET short_name = 'LIF',
    updated_at = now()
WHERE id = '0dc9fd67-b180-4396-a5d0-a505e26d2f07';

DROP FUNCTION public.generate_admission_no();

CREATE TABLE public.student_admission_counters (
  institute_id uuid NOT NULL
    REFERENCES public.institutes(id) ON DELETE CASCADE,
  academic_year_id uuid NOT NULL
    REFERENCES public.academic_years(id) ON DELETE CASCADE,
  last_value bigint NOT NULL DEFAULT 0 CHECK (last_value >= 0),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (institute_id, academic_year_id)
);

ALTER TABLE public.student_admission_counters ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.student_admission_counters FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.next_student_admission_no(
  p_institute_id uuid,
  p_academic_year_id uuid
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_institute_code text;
  v_start_year integer;
  v_end_year integer;
  v_sequence bigint;
  v_role text;
BEGIN
  SELECT COALESCE(NULLIF(btrim(p.role), ''), r.name)
  INTO v_role
  FROM public.profiles p
  LEFT JOIN public.roles r ON r.id = p.role_id
  WHERE p.id = auth.uid()
    AND p.institute_id = p_institute_id
    AND p.is_active IS TRUE;

  IF v_role IS NULL OR v_role NOT IN ('admin', 'Super Admin', 'Institute Admin') THEN
    RAISE EXCEPTION 'Not authorized to generate an admission number.';
  END IF;

  SELECT upper(btrim(i.short_name))
  INTO v_institute_code
  FROM public.institutes i
  WHERE i.id = p_institute_id;

  IF v_institute_code IS NULL OR v_institute_code = '' THEN
    RAISE EXCEPTION 'Institute code is not configured.';
  END IF;

  SELECT
    extract(year FROM ay.start_date)::integer,
    extract(year FROM ay.end_date)::integer
  INTO v_start_year, v_end_year
  FROM public.academic_years ay
  WHERE ay.id = p_academic_year_id
    AND ay.institute_id = p_institute_id
    AND ay.is_active IS TRUE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Academic Year not found or inactive.';
  END IF;

  INSERT INTO public.student_admission_counters (
    institute_id,
    academic_year_id,
    last_value
  )
  VALUES (p_institute_id, p_academic_year_id, 1)
  ON CONFLICT (institute_id, academic_year_id)
  DO UPDATE SET
    last_value = public.student_admission_counters.last_value + 1,
    updated_at = now()
  RETURNING last_value INTO v_sequence;

  IF v_sequence > 999 THEN
    RAISE EXCEPTION 'Admission number sequence exhausted for this Academic Year.';
  END IF;

  RETURN format(
    '%s/%s-%s/%s',
    v_institute_code,
    right(v_start_year::text, 2),
    right(v_end_year::text, 2),
    lpad(v_sequence::text, 3, '0')
  );
END;
$$;

REVOKE ALL ON FUNCTION public.next_student_admission_no(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.next_student_admission_no(uuid, uuid) TO authenticated;

ALTER TABLE public.students
  ADD COLUMN name text NOT NULL,
  ADD COLUMN address text,
  ADD COLUMN admission_date date NOT NULL,
  ADD COLUMN status text NOT NULL DEFAULT 'Active',
  ADD COLUMN profile_id uuid,
  ALTER COLUMN date_of_birth SET NOT NULL,
  ALTER COLUMN gender SET NOT NULL,
  ALTER COLUMN mobile SET NOT NULL,
  ALTER COLUMN email SET NOT NULL;

ALTER TABLE public.students RENAME COLUMN remarks TO comments;

ALTER TABLE public.students
  DROP COLUMN first_name,
  DROP COLUMN middle_name,
  DROP COLUMN last_name,
  DROP COLUMN roll_no,
  DROP COLUMN blood_group,
  DROP COLUMN whatsapp_no,
  DROP COLUMN aadhaar_no,
  DROP COLUMN photo_url,
  DROP COLUMN admission_status,
  DROP COLUMN is_active,
  ADD CONSTRAINT students_status_check
    CHECK (status IN ('Active', 'Inactive', 'Completed', 'Left')),
  ADD CONSTRAINT students_email_normalized_check
    CHECK (email = lower(btrim(email))),
  ADD CONSTRAINT students_profile_id_fkey
    FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD CONSTRAINT students_profile_id_key UNIQUE (profile_id),
  ADD CONSTRAINT students_id_institute_id_key UNIQUE (id, institute_id);

CREATE UNIQUE INDEX students_email_normalized_key
  ON public.students (lower(btrim(email)));

CREATE TABLE public.parents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institute_id uuid NOT NULL
    REFERENCES public.institutes(id) ON DELETE CASCADE,
  profile_id uuid UNIQUE
    REFERENCES public.profiles(id) ON DELETE SET NULL,
  name text NOT NULL,
  mobile text NOT NULL,
  email text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT parents_email_normalized_check
    CHECK (email = lower(btrim(email))),
  CONSTRAINT parents_id_institute_id_key UNIQUE (id, institute_id)
);

CREATE UNIQUE INDEX parents_institute_email_normalized_key
  ON public.parents (institute_id, lower(btrim(email)));

ALTER TABLE public.parents ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.parents FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE ON TABLE public.parents TO authenticated;

CREATE POLICY parents_admin_select
ON public.parents
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    LEFT JOIN public.roles r ON r.id = p.role_id
    WHERE p.id = auth.uid()
      AND p.institute_id = parents.institute_id
      AND p.is_active IS TRUE
      AND COALESCE(NULLIF(btrim(p.role), ''), r.name)
        IN ('admin', 'Super Admin', 'Institute Admin')
  )
);

CREATE POLICY parents_admin_insert
ON public.parents
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    LEFT JOIN public.roles r ON r.id = p.role_id
    WHERE p.id = auth.uid()
      AND p.institute_id = parents.institute_id
      AND p.is_active IS TRUE
      AND COALESCE(NULLIF(btrim(p.role), ''), r.name)
        IN ('admin', 'Super Admin', 'Institute Admin')
  )
);

CREATE POLICY parents_admin_update
ON public.parents
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    LEFT JOIN public.roles r ON r.id = p.role_id
    WHERE p.id = auth.uid()
      AND p.institute_id = parents.institute_id
      AND p.is_active IS TRUE
      AND COALESCE(NULLIF(btrim(p.role), ''), r.name)
        IN ('admin', 'Super Admin', 'Institute Admin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    LEFT JOIN public.roles r ON r.id = p.role_id
    WHERE p.id = auth.uid()
      AND p.institute_id = parents.institute_id
      AND p.is_active IS TRUE
      AND COALESCE(NULLIF(btrim(p.role), ''), r.name)
        IN ('admin', 'Super Admin', 'Institute Admin')
  )
);

CREATE TABLE public.student_parent_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institute_id uuid NOT NULL
    REFERENCES public.institutes(id) ON DELETE CASCADE,
  student_id uuid NOT NULL,
  parent_id uuid NOT NULL,
  relationship text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT student_parent_links_student_fkey
    FOREIGN KEY (student_id, institute_id)
    REFERENCES public.students(id, institute_id) ON DELETE RESTRICT,
  CONSTRAINT student_parent_links_parent_fkey
    FOREIGN KEY (parent_id, institute_id)
    REFERENCES public.parents(id, institute_id) ON DELETE RESTRICT,
  CONSTRAINT student_parent_links_student_parent_key
    UNIQUE (student_id, parent_id)
);

CREATE INDEX student_parent_links_parent_id_idx
  ON public.student_parent_links(parent_id);

ALTER TABLE public.student_parent_links ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.student_parent_links FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE ON TABLE public.student_parent_links TO authenticated;

CREATE POLICY student_parent_links_admin_select
ON public.student_parent_links
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    LEFT JOIN public.roles r ON r.id = p.role_id
    WHERE p.id = auth.uid()
      AND p.institute_id = student_parent_links.institute_id
      AND p.is_active IS TRUE
      AND COALESCE(NULLIF(btrim(p.role), ''), r.name)
        IN ('admin', 'Super Admin', 'Institute Admin')
  )
);

CREATE POLICY student_parent_links_admin_insert
ON public.student_parent_links
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    LEFT JOIN public.roles r ON r.id = p.role_id
    WHERE p.id = auth.uid()
      AND p.institute_id = student_parent_links.institute_id
      AND p.is_active IS TRUE
      AND COALESCE(NULLIF(btrim(p.role), ''), r.name)
        IN ('admin', 'Super Admin', 'Institute Admin')
  )
);

CREATE POLICY student_parent_links_admin_update
ON public.student_parent_links
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    LEFT JOIN public.roles r ON r.id = p.role_id
    WHERE p.id = auth.uid()
      AND p.institute_id = student_parent_links.institute_id
      AND p.is_active IS TRUE
      AND COALESCE(NULLIF(btrim(p.role), ''), r.name)
        IN ('admin', 'Super Admin', 'Institute Admin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    LEFT JOIN public.roles r ON r.id = p.role_id
    WHERE p.id = auth.uid()
      AND p.institute_id = student_parent_links.institute_id
      AND p.is_active IS TRUE
      AND COALESCE(NULLIF(btrim(p.role), ''), r.name)
        IN ('admin', 'Super Admin', 'Institute Admin')
  )
);

INSERT INTO public.roles (name, description)
VALUES
  ('Student', 'Student portal user'),
  ('Parent', 'Parent or guardian portal user')
ON CONFLICT (name) DO NOTHING;

ALTER TABLE public.student_batches
  ADD CONSTRAINT student_batches_student_id_fkey
  FOREIGN KEY (student_id)
  REFERENCES public.students(id)
  ON DELETE RESTRICT;

COMMIT;
