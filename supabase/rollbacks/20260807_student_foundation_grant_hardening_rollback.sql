BEGIN;

GRANT ALL ON TABLE public.parents TO authenticated;
GRANT ALL ON TABLE public.student_parent_links TO authenticated;

COMMIT;
