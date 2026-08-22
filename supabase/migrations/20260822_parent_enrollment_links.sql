BEGIN;

CREATE TABLE public.student_enrollment_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institute_id uuid NOT NULL REFERENCES public.institutes(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  token_hash text NOT NULL UNIQUE,
  parent_mobile text NOT NULL CHECK (parent_mobile ~ '^[6-9][0-9]{9}$'),
  academic_year_id uuid NOT NULL REFERENCES public.academic_years(id) ON DELETE RESTRICT,
  class_id uuid NOT NULL REFERENCES public.academic_classes(id) ON DELETE RESTRICT,
  fee_structure_id uuid NOT NULL REFERENCES public.class_fee_structures(id) ON DELETE RESTRICT,
  status text NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','SUBMITTED','REVOKED','EXPIRED')),
  expires_at timestamptz NOT NULL,
  verified_student_email text,
  student_email_verified_at timestamptz,
  verified_parent_email text,
  parent_email_verified_at timestamptz,
  rules_version text NOT NULL DEFAULT '1.0',
  submitted_student_id uuid REFERENCES public.students(id) ON DELETE SET NULL,
  submitted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT student_enrollment_invites_student_email_check CHECK (
    verified_student_email IS NULL OR verified_student_email = lower(btrim(verified_student_email))
  ),
  CONSTRAINT student_enrollment_invites_parent_email_check CHECK (
    verified_parent_email IS NULL OR verified_parent_email = lower(btrim(verified_parent_email))
  )
);

CREATE INDEX student_enrollment_invites_institute_status_idx
  ON public.student_enrollment_invites(institute_id, status, created_at DESC);
CREATE INDEX student_enrollment_invites_expiry_idx
  ON public.student_enrollment_invites(expires_at)
  WHERE status = 'ACTIVE';

ALTER TABLE public.student_enrollment_invites ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.student_enrollment_invites FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.student_enrollment_invites TO service_role;

CREATE TABLE public.student_enrollment_email_otps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invite_id uuid NOT NULL REFERENCES public.student_enrollment_invites(id) ON DELETE CASCADE,
  purpose text NOT NULL CHECK (purpose IN ('STUDENT','PARENT')),
  email text NOT NULL CHECK (email = lower(btrim(email))),
  code_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  attempt_count integer NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  sent_at timestamptz NOT NULL DEFAULT now(),
  consumed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(invite_id, purpose)
);

ALTER TABLE public.student_enrollment_email_otps ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.student_enrollment_email_otps FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.student_enrollment_email_otps TO service_role;

CREATE OR REPLACE FUNCTION public.submit_parent_enrollment(
  p_token_hash text,
  p_name text,
  p_mother_name text,
  p_gender text,
  p_date_of_birth date,
  p_student_mobile text,
  p_student_email text,
  p_address text,
  p_parent_name text,
  p_relationship text,
  p_parent_email text,
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
BEGIN
  IF current_user <> 'service_role' THEN
    RAISE EXCEPTION 'PARENT_ENROLLMENT_SERVICE_ROLE_REQUIRED';
  END IF;

  SELECT * INTO v_invite
  FROM public.student_enrollment_invites
  WHERE token_hash = p_token_hash
  FOR UPDATE;

  IF NOT FOUND OR v_invite.status <> 'ACTIVE' THEN
    RAISE EXCEPTION 'PARENT_ENROLLMENT_INVALID';
  END IF;
  IF v_invite.expires_at <= now() THEN
    UPDATE public.student_enrollment_invites
      SET status='EXPIRED', updated_at=now()
      WHERE id=v_invite.id;
    RAISE EXCEPTION 'PARENT_ENROLLMENT_EXPIRED';
  END IF;
  IF p_rules_accepted IS NOT TRUE THEN
    RAISE EXCEPTION 'PARENT_ENROLLMENT_RULES_REQUIRED';
  END IF;
  IF p_student_mobile !~ '^[6-9][0-9]{9}$' THEN
    RAISE EXCEPTION 'PARENT_ENROLLMENT_STUDENT_MOBILE_INVALID';
  END IF;
  IF lower(btrim(p_student_email)) IS DISTINCT FROM v_invite.verified_student_email
     OR v_invite.student_email_verified_at IS NULL THEN
    RAISE EXCEPTION 'PARENT_ENROLLMENT_STUDENT_EMAIL_UNVERIFIED';
  END IF;
  IF lower(btrim(p_parent_email)) IS DISTINCT FROM v_invite.verified_parent_email
     OR v_invite.parent_email_verified_at IS NULL THEN
    RAISE EXCEPTION 'PARENT_ENROLLMENT_PARENT_EMAIL_UNVERIFIED';
  END IF;
  IF EXISTS (SELECT 1 FROM public.students s WHERE s.email=lower(btrim(p_student_email))) THEN
    RAISE EXCEPTION 'PARENT_ENROLLMENT_STUDENT_EMAIL_EXISTS';
  END IF;

  SELECT * INTO v_existing_parent
  FROM public.parents p
  WHERE p.institute_id=v_invite.institute_id
    AND p.email=lower(btrim(p_parent_email))
  LIMIT 1;

  IF FOUND AND (
    upper(btrim(v_existing_parent.name)) <> upper(btrim(p_parent_name))
    OR v_existing_parent.mobile <> v_invite.parent_mobile
  ) THEN
    RAISE EXCEPTION 'PARENT_ENROLLMENT_PARENT_CONFLICT';
  END IF;

  PERFORM set_config('request.jwt.claim.sub', v_invite.created_by::text, true);

  SELECT public.create_student_admission_foundation(
    v_invite.academic_year_id,
    upper(btrim(p_name)),
    upper(btrim(coalesce(p_mother_name,''))),
    p_gender,
    p_date_of_birth,
    p_student_mobile,
    lower(btrim(p_student_email)),
    upper(btrim(coalesce(p_address,''))),
    current_date,
    'Active',
    'CREATED VIA PARENT ENROLLMENT LINK',
    CASE WHEN v_existing_parent.id IS NULL THEN NULL ELSE v_existing_parent.id END,
    upper(btrim(p_parent_name)),
    v_invite.parent_mobile,
    lower(btrim(p_parent_email)),
    p_relationship
  ) INTO v_foundation;

  v_student_id := (v_foundation->>'student_id')::uuid;
  v_admission_no := v_foundation->>'admission_no';

  SELECT coalesce(jsonb_agg(jsonb_build_object(
    'itemId', i.id,
    'include', true,
    'amount', i.amount,
    'discountType', null,
    'discountValue', 0
  ) ORDER BY i.display_order), '[]'::jsonb)
  INTO v_fee_items
  FROM public.class_fee_structure_items i
  WHERE i.class_fee_structure_id=v_invite.fee_structure_id
    AND i.institute_id=v_invite.institute_id;

  PERFORM public.apply_class_fee_structure(v_student_id, v_invite.fee_structure_id, v_fee_items);

  UPDATE public.student_enrollment_invites
  SET status='SUBMITTED', submitted_student_id=v_student_id, submitted_at=now(), updated_at=now()
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

REVOKE ALL ON FUNCTION public.submit_parent_enrollment(text,text,text,text,date,text,text,text,text,text,text,boolean)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_parent_enrollment(text,text,text,text,date,text,text,text,text,text,text,boolean)
  TO service_role;

COMMIT;
