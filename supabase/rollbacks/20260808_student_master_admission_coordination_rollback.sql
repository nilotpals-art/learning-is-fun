BEGIN;

DROP FUNCTION IF EXISTS public.compensate_student_admission_foundation(
  uuid, uuid, boolean
);
DROP FUNCTION IF EXISTS public.create_student_admission_foundation(
  uuid, text, text, text, date, text, text, text, date, text, text,
  uuid, text, text, text, text
);

ALTER TABLE public.students
DROP COLUMN IF EXISTS mother_name;

COMMIT;
