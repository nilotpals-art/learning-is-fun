BEGIN;

DROP INDEX public.student_parent_links_student_institute_idx;
DROP INDEX public.student_parent_links_parent_institute_idx;
DROP INDEX public.student_parent_links_institute_id_idx;

CREATE INDEX student_parent_links_parent_id_idx
  ON public.student_parent_links(parent_id);

-- Policy predicates remain semantically identical. The scalar auth.uid()
-- subquery optimization is intentionally retained during rollback.

COMMIT;
