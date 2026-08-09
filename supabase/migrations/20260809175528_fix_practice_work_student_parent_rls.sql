BEGIN;

CREATE OR REPLACE FUNCTION public.practice_work_student_id(p_institute_id uuid) RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
  SELECT s.id
  FROM public.students s
  JOIN public.profiles p ON p.id=s.profile_id AND p.institute_id=s.institute_id
  WHERE p.id=(SELECT auth.uid())
    AND p.is_active IS TRUE
    AND p.role='Student'
    AND p.institute_id=p_institute_id
    AND s.institute_id=p_institute_id
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.practice_work_parent_can_view_student(p_institute_id uuid,p_student_id uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
  SELECT EXISTS(
    SELECT 1
    FROM public.parents pa
    JOIN public.profiles p ON p.id=pa.profile_id AND p.institute_id=pa.institute_id
    JOIN public.student_parent_links spl ON spl.parent_id=pa.id AND spl.institute_id=pa.institute_id
    WHERE p.id=(SELECT auth.uid())
      AND p.is_active IS TRUE
      AND p.role='Parent'
      AND pa.is_active IS TRUE
      AND pa.institute_id=p_institute_id
      AND spl.student_id=p_student_id
  );
$$;

REVOKE ALL ON FUNCTION public.practice_work_student_id(uuid),public.practice_work_parent_can_view_student(uuid,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.practice_work_student_id(uuid),public.practice_work_parent_can_view_student(uuid,uuid) TO authenticated;

DROP POLICY assignments_parent_select ON public.practice_assignments;
CREATE POLICY assignments_parent_select ON public.practice_assignments FOR SELECT TO authenticated
USING(public.practice_work_parent_can_view_student(institute_id,student_id));

DROP POLICY attempts_parent_select ON public.practice_attempts;
CREATE POLICY attempts_parent_select ON public.practice_attempts FOR SELECT TO authenticated
USING(public.practice_work_parent_can_view_student(institute_id,student_id));

COMMIT;
