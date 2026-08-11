BEGIN;

CREATE FUNCTION public.set_class_fee_structure_active(p_structure_id uuid,p_is_active boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_institute uuid:=public.fee_admin_institute_id();
BEGIN
  IF v_institute IS NULL THEN RAISE EXCEPTION 'FEES_UNAUTHORIZED'; END IF;
  UPDATE public.class_fee_structures SET is_active=p_is_active,updated_by=(SELECT auth.uid()),updated_at=now() WHERE id=p_structure_id AND institute_id=v_institute;
  IF NOT FOUND THEN RAISE EXCEPTION 'FEES_STRUCTURE_NOT_FOUND'; END IF;
END $$;

REVOKE ALL ON FUNCTION public.set_class_fee_structure_active(uuid,boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.set_class_fee_structure_active(uuid,boolean) TO authenticated;

COMMIT;
