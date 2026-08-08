BEGIN;

REVOKE ALL ON TABLE public.parents FROM authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.parents TO authenticated;

REVOKE ALL ON TABLE public.student_parent_links FROM authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.student_parent_links TO authenticated;

COMMIT;
