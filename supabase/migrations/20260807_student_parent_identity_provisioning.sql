BEGIN;

CREATE OR REPLACE FUNCTION public.finalize_student_identity(
  p_student_id uuid,
  p_auth_user_id uuid,
  p_email text
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_institute_id uuid;
  v_student public.students%ROWTYPE;
  v_role_id uuid;
  v_profile_role text;
BEGIN
  SELECT p.institute_id
  INTO v_institute_id
  FROM public.profiles p
  LEFT JOIN public.roles r ON r.id = p.role_id
  WHERE p.id = auth.uid()
    AND p.is_active IS TRUE
    AND COALESCE(NULLIF(btrim(p.role), ''), r.name)
      IN ('admin', 'Super Admin', 'Institute Admin');

  IF v_institute_id IS NULL THEN
    RAISE EXCEPTION 'PROVISIONING_UNAUTHORIZED';
  END IF;

  IF p_email IS NULL OR p_email <> lower(btrim(p_email)) THEN
    RAISE EXCEPTION 'PROVISIONING_EMAIL_NOT_NORMALIZED';
  END IF;

  SELECT *
  INTO v_student
  FROM public.students
  WHERE id = p_student_id
    AND institute_id = v_institute_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'PROVISIONING_STUDENT_NOT_FOUND';
  END IF;

  IF v_student.email <> p_email THEN
    RAISE EXCEPTION 'PROVISIONING_EMAIL_MISMATCH';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM auth.users u
    WHERE u.id = p_auth_user_id
      AND lower(btrim(u.email)) = p_email
  ) THEN
    RAISE EXCEPTION 'PROVISIONING_AUTH_IDENTITY_MISMATCH';
  END IF;

  IF v_student.profile_id IS NOT NULL THEN
    IF v_student.profile_id <> p_auth_user_id THEN
      RAISE EXCEPTION 'PROVISIONING_DOMAIN_ALREADY_LINKED';
    END IF;

    SELECT COALESCE(NULLIF(btrim(p.role), ''), r.name)
    INTO v_profile_role
    FROM public.profiles p
    LEFT JOIN public.roles r ON r.id = p.role_id
    WHERE p.id = p_auth_user_id
      AND p.institute_id = v_institute_id
      AND p.is_active IS TRUE
      AND lower(btrim(p.email)) = p_email;

    IF v_profile_role <> 'Student' THEN
      RAISE EXCEPTION 'PROVISIONING_PROFILE_CONFLICT';
    END IF;

    RETURN 'reused';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = p_auth_user_id
       OR lower(btrim(p.email)) = p_email
  ) THEN
    RAISE EXCEPTION 'PROVISIONING_PROFILE_CONFLICT';
  END IF;

  SELECT id INTO v_role_id
  FROM public.roles
  WHERE name = 'Student';

  IF v_role_id IS NULL THEN
    RAISE EXCEPTION 'PROVISIONING_ROLE_MISSING';
  END IF;

  INSERT INTO public.profiles (
    id,
    institute_id,
    name,
    mobile,
    role,
    role_id,
    is_active,
    email
  )
  VALUES (
    p_auth_user_id,
    v_institute_id,
    v_student.name,
    v_student.mobile,
    'Student',
    v_role_id,
    TRUE,
    p_email
  );

  UPDATE public.students
  SET profile_id = p_auth_user_id,
      updated_at = now()
  WHERE id = p_student_id
    AND institute_id = v_institute_id;

  RETURN 'created';
END;
$$;

CREATE OR REPLACE FUNCTION public.finalize_parent_identity(
  p_parent_id uuid,
  p_auth_user_id uuid,
  p_email text,
  p_student_id uuid,
  p_relationship text
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_institute_id uuid;
  v_parent public.parents%ROWTYPE;
  v_role_id uuid;
  v_profile_role text;
  v_outcome text := 'created';
BEGIN
  SELECT p.institute_id
  INTO v_institute_id
  FROM public.profiles p
  LEFT JOIN public.roles r ON r.id = p.role_id
  WHERE p.id = auth.uid()
    AND p.is_active IS TRUE
    AND COALESCE(NULLIF(btrim(p.role), ''), r.name)
      IN ('admin', 'Super Admin', 'Institute Admin');

  IF v_institute_id IS NULL THEN
    RAISE EXCEPTION 'PROVISIONING_UNAUTHORIZED';
  END IF;

  IF p_email IS NULL OR p_email <> lower(btrim(p_email)) THEN
    RAISE EXCEPTION 'PROVISIONING_EMAIL_NOT_NORMALIZED';
  END IF;

  SELECT *
  INTO v_parent
  FROM public.parents
  WHERE id = p_parent_id
    AND institute_id = v_institute_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'PROVISIONING_PARENT_NOT_FOUND';
  END IF;

  IF v_parent.email <> p_email THEN
    RAISE EXCEPTION 'PROVISIONING_EMAIL_MISMATCH';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM auth.users u
    WHERE u.id = p_auth_user_id
      AND lower(btrim(u.email)) = p_email
  ) THEN
    RAISE EXCEPTION 'PROVISIONING_AUTH_IDENTITY_MISMATCH';
  END IF;

  IF v_parent.profile_id IS NOT NULL THEN
    IF v_parent.profile_id <> p_auth_user_id THEN
      RAISE EXCEPTION 'PROVISIONING_DOMAIN_ALREADY_LINKED';
    END IF;

    SELECT COALESCE(NULLIF(btrim(p.role), ''), r.name)
    INTO v_profile_role
    FROM public.profiles p
    LEFT JOIN public.roles r ON r.id = p.role_id
    WHERE p.id = p_auth_user_id
      AND p.institute_id = v_institute_id
      AND p.is_active IS TRUE
      AND lower(btrim(p.email)) = p_email;

    IF v_profile_role <> 'Parent' THEN
      RAISE EXCEPTION 'PROVISIONING_PROFILE_CONFLICT';
    END IF;

    v_outcome := 'reused';
  ELSE
    IF EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = p_auth_user_id
         OR lower(btrim(p.email)) = p_email
    ) THEN
      RAISE EXCEPTION 'PROVISIONING_PROFILE_CONFLICT';
    END IF;

    SELECT id INTO v_role_id
    FROM public.roles
    WHERE name = 'Parent';

    IF v_role_id IS NULL THEN
      RAISE EXCEPTION 'PROVISIONING_ROLE_MISSING';
    END IF;

    INSERT INTO public.profiles (
      id,
      institute_id,
      name,
      mobile,
      role,
      role_id,
      is_active,
      email
    )
    VALUES (
      p_auth_user_id,
      v_institute_id,
      v_parent.name,
      v_parent.mobile,
      'Parent',
      v_role_id,
      v_parent.is_active,
      p_email
    );

    UPDATE public.parents
    SET profile_id = p_auth_user_id,
        updated_at = now()
    WHERE id = p_parent_id
      AND institute_id = v_institute_id;
  END IF;

  IF p_student_id IS NOT NULL THEN
    IF p_relationship IS NULL OR btrim(p_relationship) = '' THEN
      RAISE EXCEPTION 'PROVISIONING_RELATIONSHIP_REQUIRED';
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM public.students s
      WHERE s.id = p_student_id
        AND s.institute_id = v_institute_id
    ) THEN
      RAISE EXCEPTION 'PROVISIONING_STUDENT_NOT_FOUND';
    END IF;

    INSERT INTO public.student_parent_links (
      institute_id,
      student_id,
      parent_id,
      relationship
    )
    VALUES (
      v_institute_id,
      p_student_id,
      p_parent_id,
      btrim(p_relationship)
    )
    ON CONFLICT (student_id, parent_id) DO NOTHING;
  END IF;

  RETURN v_outcome;
END;
$$;

REVOKE ALL ON FUNCTION public.finalize_student_identity(uuid, uuid, text)
FROM PUBLIC, anon;

REVOKE ALL ON FUNCTION public.finalize_parent_identity(uuid, uuid, text, uuid, text)
FROM PUBLIC, anon;

GRANT EXECUTE
ON FUNCTION public.finalize_student_identity(uuid, uuid, text)
TO authenticated;

GRANT EXECUTE
ON FUNCTION public.finalize_parent_identity(uuid, uuid, text, uuid, text)
TO authenticated;

COMMIT;
