BEGIN;

ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS school_name text;

DROP FUNCTION IF EXISTS public.submit_parent_enrollment(text,text,text,text,date,text,text,text,text,text,text,boolean);

CREATE OR REPLACE FUNCTION public.submit_parent_enrollment(
  p_token_hash text,
  p_name text,
  p_mother_name text,
  p_gender text,
  p_date_of_birth date,
  p_student_mobile text,
  p_student_email text,
  p_school_name text,
  p_address text,
  p_parent_name text,
  p_relationship text,
  p_parent_email text,
  p_parent_request text,
  p_rules_accepted boolean
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_invite public.student_enrollment_invites%ROWTYPE;
  v_existing_parent public.parents%ROWTYPE;
  v_foundation jsonb;
  v_fee_items jsonb;
  v_student_id uuid;
  v_admission_no text;
  v_student_email text := NULLIF(lower(btrim(p_student_email)), '');
  v_parent_email text := NULLIF(lower(btrim(p_parent_email)), '');
  v_comments text;
BEGIN
  SELECT * INTO v_invite
  FROM public.student_enrollment_invites
  WHERE token_hash = p_token_hash
  FOR UPDATE;

  IF NOT FOUND OR v_invite.status <> 'ACTIVE' THEN RAISE EXCEPTION 'PARENT_ENROLLMENT_INVALID'; END IF;
  IF v_invite.expires_at <= now() THEN
    UPDATE public.student_enrollment_invites SET status='EXPIRED', updated_at=now() WHERE id=v_invite.id;
    RAISE EXCEPTION 'PARENT_ENROLLMENT_EXPIRED';
  END IF;
  IF p_rules_accepted IS NOT TRUE THEN RAISE EXCEPTION 'PARENT_ENROLLMENT_RULES_REQUIRED'; END IF;
  IF p_student_mobile !~ '^[6-9][0-9]{9}$' THEN RAISE EXCEPTION 'PARENT_ENROLLMENT_STUDENT_MOBILE_INVALID'; END IF;
  IF v_student_email IS NULL AND v_parent_email IS NULL THEN RAISE EXCEPTION 'PARENT_ENROLLMENT_EMAIL_REQUIRED'; END IF;
  IF v_student_email IS NOT NULL AND v_parent_email IS NOT NULL AND v_student_email = v_parent_email THEN RAISE EXCEPTION 'PARENT_ENROLLMENT_EMAILS_MUST_DIFFER'; END IF;

  IF v_student_email IS NOT NULL AND (v_student_email IS DISTINCT FROM v_invite.verified_student_email OR v_invite.student_email_verified_at IS NULL) THEN
    RAISE EXCEPTION 'PARENT_ENROLLMENT_STUDENT_EMAIL_UNVERIFIED';
  END IF;
  IF v_parent_email IS NOT NULL AND (v_parent_email IS DISTINCT FROM v_invite.verified_parent_email OR v_invite.parent_email_verified_at IS NULL) THEN
    RAISE EXCEPTION 'PARENT_ENROLLMENT_PARENT_EMAIL_UNVERIFIED';
  END IF;
  IF v_student_email IS NOT NULL AND EXISTS (SELECT 1 FROM public.students s WHERE s.email=v_student_email) THEN
    RAISE EXCEPTION 'PARENT_ENROLLMENT_STUDENT_EMAIL_EXISTS';
  END IF;

  IF v_parent_email IS NOT NULL THEN
    SELECT * INTO v_existing_parent FROM public.parents p
    WHERE p.institute_id=v_invite.institute_id AND p.email=v_parent_email LIMIT 1;
  END IF;
  IF v_existing_parent.id IS NULL THEN
    SELECT * INTO v_existing_parent FROM public.parents p
    WHERE p.institute_id=v_invite.institute_id AND p.mobile=v_invite.parent_mobile
    ORDER BY p.created_at LIMIT 1;
  END IF;
  IF v_existing_parent.id IS NOT NULL THEN
    IF upper(btrim(v_existing_parent.name)) <> upper(btrim(p_parent_name)) THEN RAISE EXCEPTION 'PARENT_ENROLLMENT_PARENT_CONFLICT'; END IF;
    IF v_parent_email IS NOT NULL AND v_existing_parent.email IS NOT NULL AND v_existing_parent.email <> v_parent_email THEN RAISE EXCEPTION 'PARENT_ENROLLMENT_PARENT_CONFLICT'; END IF;
    IF v_parent_email IS NOT NULL AND v_existing_parent.email IS NULL THEN
      UPDATE public.parents SET email=v_parent_email, updated_at=now() WHERE id=v_existing_parent.id;
      v_existing_parent.email := v_parent_email;
    END IF;
  END IF;

  v_comments := 'CREATED VIA PARENT ENROLLMENT LINK';
  IF NULLIF(btrim(coalesce(p_parent_request,'')), '') IS NOT NULL THEN
    v_comments := v_comments || E'\nPARENT REQUEST: ' || upper(btrim(p_parent_request));
  END IF;

  PERFORM set_config('request.jwt.claim.sub', v_invite.created_by::text, true);
  SELECT public.create_student_admission_foundation(
    v_invite.academic_year_id,
    upper(btrim(p_name)),
    upper(btrim(coalesce(p_mother_name,''))),
    p_gender,
    p_date_of_birth,
    p_student_mobile,
    v_student_email,
    upper(btrim(coalesce(p_address,''))),
    current_date,
    'Active',
    v_comments,
    CASE WHEN v_existing_parent.id IS NULL THEN NULL ELSE v_existing_parent.id END,
    upper(btrim(p_parent_name)),
    v_invite.parent_mobile,
    v_parent_email,
    p_relationship
  ) INTO v_foundation;

  v_student_id := (v_foundation->>'student_id')::uuid;
  v_admission_no := v_foundation->>'admission_no';

  UPDATE public.students
  SET school_name=NULLIF(upper(btrim(coalesce(p_school_name,''))), ''), updated_at=now()
  WHERE id=v_student_id;

  SELECT coalesce(jsonb_agg(jsonb_build_object(
    'itemId', i.id, 'include', true, 'amount', i.amount, 'discountType', null, 'discountValue', 0
  ) ORDER BY i.display_order), '[]'::jsonb)
  INTO v_fee_items
  FROM public.class_fee_structure_items i
  WHERE i.class_fee_structure_id=v_invite.fee_structure_id
    AND i.institute_id=v_invite.institute_id;

  PERFORM public.apply_class_fee_structure(v_student_id, v_invite.fee_structure_id, v_fee_items);

  UPDATE public.student_enrollment_invites
  SET status='SUBMITTED', submitted_student_id=v_student_id, submitted_at=now(), rules_accepted_at=now(), updated_at=now()
  WHERE id=v_invite.id;

  RETURN jsonb_build_object(
    'student_id', v_student_id,
    'parent_id', v_foundation->>'parent_id',
    'parent_created', (v_foundation->>'parent_created')::boolean,
    'admission_no', v_admission_no,
    'enrollment_date', current_date
  );
END;
$$;

REVOKE ALL ON FUNCTION public.submit_parent_enrollment(text,text,text,text,date,text,text,text,text,text,text,text,text,boolean)
FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_parent_enrollment(text,text,text,text,date,text,text,text,text,text,text,text,text,boolean)
TO service_role;

COMMIT;
