BEGIN;

ALTER TABLE public.students
  DROP CONSTRAINT IF EXISTS students_school_board_institute_fkey;

ALTER TABLE public.students
  ADD CONSTRAINT students_school_board_institute_fkey
  FOREIGN KEY (school_board_id, institute_id)
  REFERENCES public.boards (id, institute_id)
  ON DELETE RESTRICT;

COMMIT;
