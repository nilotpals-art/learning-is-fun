-- Apply the foundational migration's original apply_class_fee_structure
-- definition when deliberately reverting only override hardening.
BEGIN;
DROP FUNCTION IF EXISTS public.apply_class_fee_structure(uuid,uuid,jsonb);
COMMIT;
