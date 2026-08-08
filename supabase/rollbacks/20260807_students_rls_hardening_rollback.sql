BEGIN;

DROP POLICY IF EXISTS students_admin_update ON public.students;
DROP POLICY IF EXISTS students_admin_insert ON public.students;
DROP POLICY IF EXISTS students_admin_select ON public.students;

ALTER TABLE public.students DISABLE ROW LEVEL SECURITY;
GRANT ALL ON TABLE public.students TO anon, authenticated;

COMMIT;
