BEGIN;

DROP FUNCTION IF EXISTS public.change_student_assignment(
  uuid, uuid, uuid, uuid, uuid, uuid, date, text, text
);
DROP TABLE IF EXISTS public.student_assignments;

ALTER TABLE public.batches
  DROP CONSTRAINT IF EXISTS batches_id_institute_board_class_key;
ALTER TABLE public.academic_classes
  DROP CONSTRAINT IF EXISTS academic_classes_id_institute_id_key;
ALTER TABLE public.boards
  DROP CONSTRAINT IF EXISTS boards_id_institute_id_key;
ALTER TABLE public.schools
  DROP CONSTRAINT IF EXISTS schools_id_institute_id_key;
ALTER TABLE public.academic_years
  DROP CONSTRAINT IF EXISTS academic_years_id_institute_id_key;

DROP EXTENSION IF EXISTS btree_gist;

COMMIT;
