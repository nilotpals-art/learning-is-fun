BEGIN;

CREATE OR REPLACE FUNCTION public.delete_teaching_batch(p_batch_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_profile public.profiles%ROWTYPE;
BEGIN
  SELECT * INTO v_profile
  FROM public.profiles
  WHERE id = (SELECT auth.uid())
    AND is_active IS TRUE
    AND role IN ('Administrator', 'Super Admin', 'admin', 'Institute Admin');

  IF v_profile.id IS NULL THEN
    RAISE EXCEPTION 'BATCH_UNAUTHORIZED';
  END IF;

  DELETE FROM public.batches
  WHERE id = p_batch_id
    AND institute_id = v_profile.institute_id;

  RETURN FOUND;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_teaching_batch(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_teaching_batch(uuid) TO authenticated;

COMMIT;
