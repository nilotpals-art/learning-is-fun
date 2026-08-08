BEGIN;

DROP FUNCTION IF EXISTS public.finalize_parent_identity(uuid, uuid, text, uuid, text);
DROP FUNCTION IF EXISTS public.finalize_student_identity(uuid, uuid, text);

COMMIT;
