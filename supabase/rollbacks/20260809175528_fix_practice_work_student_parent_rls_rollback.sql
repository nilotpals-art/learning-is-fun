BEGIN;

DROP POLICY assignments_parent_select ON public.practice_assignments;
DROP POLICY attempts_parent_select ON public.practice_attempts;

CREATE OR REPLACE FUNCTION public.practice_work_student_id(p_institute_id uuid) RETURNS uuid
LANGUAGE sql STABLE SECURITY INVOKER SET search_path='' AS $$
  SELECT s.id FROM public.students s JOIN public.profiles p ON p.id=s.profile_id
  WHERE p.id=(SELECT auth.uid()) AND p.is_active IS TRUE AND p.role='Student'
    AND s.institute_id=p_institute_id LIMIT 1;
$$;

CREATE POLICY assignments_parent_select ON public.practice_assignments FOR SELECT TO authenticated
USING(EXISTS(
  SELECT 1 FROM public.parents pa JOIN public.profiles p ON p.id=pa.profile_id
  JOIN public.student_parent_links spl ON spl.parent_id=pa.id AND spl.institute_id=pa.institute_id
  WHERE p.id=(SELECT auth.uid()) AND p.is_active IS TRUE AND pa.is_active IS TRUE
    AND spl.student_id=practice_assignments.student_id AND pa.institute_id=practice_assignments.institute_id
));
CREATE POLICY attempts_parent_select ON public.practice_attempts FOR SELECT TO authenticated
USING(EXISTS(
  SELECT 1 FROM public.parents pa JOIN public.profiles p ON p.id=pa.profile_id
  JOIN public.student_parent_links spl ON spl.parent_id=pa.id AND spl.institute_id=pa.institute_id
  WHERE p.id=(SELECT auth.uid()) AND p.is_active IS TRUE
    AND spl.student_id=practice_attempts.student_id AND pa.institute_id=practice_attempts.institute_id
));

DROP FUNCTION public.practice_work_parent_can_view_student(uuid,uuid);
REVOKE ALL ON FUNCTION public.practice_work_student_id(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.practice_work_student_id(uuid) TO authenticated;

COMMIT;
