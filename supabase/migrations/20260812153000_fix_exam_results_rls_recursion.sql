BEGIN;

CREATE SCHEMA IF NOT EXISTS exam_results_private;
REVOKE ALL ON SCHEMA exam_results_private FROM PUBLIC, anon;
GRANT USAGE ON SCHEMA exam_results_private TO authenticated;

CREATE FUNCTION exam_results_private.can_admin_view_result_set(p_result_set_id uuid, p_draft_only boolean DEFAULT false)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
  SELECT (SELECT auth.uid()) IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.exam_result_sets rs
    JOIN public.schedule_events e ON e.id=rs.schedule_event_id AND e.institute_id=rs.institute_id
    WHERE rs.id=p_result_set_id AND (NOT p_draft_only OR rs.status='draft')
      AND public.learning_planner_admin_scope(e.institute_id,e.branch_id)
  );
$$;

CREATE FUNCTION exam_results_private.can_student_view_result_set(p_result_set_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
  SELECT (SELECT auth.uid()) IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.exam_result_sets rs
    JOIN public.exam_student_results r ON r.exam_result_set_id=rs.id AND r.institute_id=rs.institute_id
    JOIN public.students s ON s.id=r.student_id AND s.institute_id=r.institute_id
    JOIN public.profiles p ON p.id=s.profile_id AND p.institute_id=s.institute_id
    WHERE rs.id=p_result_set_id AND rs.status='published' AND s.status='Active'
      AND p.id=(SELECT auth.uid()) AND p.is_active IS TRUE AND p.role='Student'
  );
$$;

CREATE FUNCTION exam_results_private.can_parent_view_result_set(p_result_set_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
  SELECT (SELECT auth.uid()) IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.exam_result_sets rs
    JOIN public.exam_student_results r ON r.exam_result_set_id=rs.id AND r.institute_id=rs.institute_id
    JOIN public.students s ON s.id=r.student_id AND s.institute_id=r.institute_id
    JOIN public.student_parent_links l ON l.student_id=s.id AND l.institute_id=s.institute_id
    JOIN public.parents pa ON pa.id=l.parent_id AND pa.institute_id=l.institute_id
    JOIN public.profiles p ON p.id=pa.profile_id AND p.institute_id=pa.institute_id
    WHERE rs.id=p_result_set_id AND rs.status='published' AND s.status='Active' AND pa.is_active IS TRUE
      AND p.id=(SELECT auth.uid()) AND p.is_active IS TRUE AND p.role='Parent'
  );
$$;

CREATE FUNCTION exam_results_private.can_student_view_result(p_result_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
  SELECT (SELECT auth.uid()) IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.exam_student_results r
    JOIN public.exam_result_sets rs ON rs.id=r.exam_result_set_id AND rs.institute_id=r.institute_id
    JOIN public.students s ON s.id=r.student_id AND s.institute_id=r.institute_id
    JOIN public.profiles p ON p.id=s.profile_id AND p.institute_id=s.institute_id
    WHERE r.id=p_result_id AND rs.status='published' AND s.status='Active'
      AND p.id=(SELECT auth.uid()) AND p.is_active IS TRUE AND p.role='Student'
  );
$$;

CREATE FUNCTION exam_results_private.can_parent_view_result(p_result_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
  SELECT (SELECT auth.uid()) IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.exam_student_results r
    JOIN public.exam_result_sets rs ON rs.id=r.exam_result_set_id AND rs.institute_id=r.institute_id
    JOIN public.students s ON s.id=r.student_id AND s.institute_id=r.institute_id
    JOIN public.student_parent_links l ON l.student_id=s.id AND l.institute_id=s.institute_id
    JOIN public.parents pa ON pa.id=l.parent_id AND pa.institute_id=l.institute_id
    JOIN public.profiles p ON p.id=pa.profile_id AND p.institute_id=pa.institute_id
    WHERE r.id=p_result_id AND rs.status='published' AND s.status='Active' AND pa.is_active IS TRUE
      AND p.id=(SELECT auth.uid()) AND p.is_active IS TRUE AND p.role='Parent'
  );
$$;

REVOKE ALL ON FUNCTION exam_results_private.can_admin_view_result_set(uuid,boolean),
  exam_results_private.can_student_view_result_set(uuid),
  exam_results_private.can_parent_view_result_set(uuid),
  exam_results_private.can_student_view_result(uuid),
  exam_results_private.can_parent_view_result(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION exam_results_private.can_admin_view_result_set(uuid,boolean),
  exam_results_private.can_student_view_result_set(uuid),
  exam_results_private.can_parent_view_result_set(uuid),
  exam_results_private.can_student_view_result(uuid),
  exam_results_private.can_parent_view_result(uuid) TO authenticated;

DROP POLICY exam_result_sets_student_select ON public.exam_result_sets;
DROP POLICY exam_result_sets_parent_select ON public.exam_result_sets;
DROP POLICY exam_student_results_admin_select ON public.exam_student_results;
DROP POLICY exam_student_results_admin_insert ON public.exam_student_results;
DROP POLICY exam_student_results_admin_update ON public.exam_student_results;
DROP POLICY exam_student_results_admin_delete ON public.exam_student_results;
DROP POLICY exam_student_results_student_select ON public.exam_student_results;
DROP POLICY exam_student_results_parent_select ON public.exam_student_results;

CREATE POLICY exam_result_sets_student_select ON public.exam_result_sets FOR SELECT TO authenticated
USING ((SELECT exam_results_private.can_student_view_result_set(id)));
CREATE POLICY exam_result_sets_parent_select ON public.exam_result_sets FOR SELECT TO authenticated
USING ((SELECT exam_results_private.can_parent_view_result_set(id)));
CREATE POLICY exam_student_results_admin_select ON public.exam_student_results FOR SELECT TO authenticated
USING ((SELECT exam_results_private.can_admin_view_result_set(exam_result_set_id,false)));
CREATE POLICY exam_student_results_admin_insert ON public.exam_student_results FOR INSERT TO authenticated
WITH CHECK ((SELECT exam_results_private.can_admin_view_result_set(exam_result_set_id,true)));
CREATE POLICY exam_student_results_admin_update ON public.exam_student_results FOR UPDATE TO authenticated
USING ((SELECT exam_results_private.can_admin_view_result_set(exam_result_set_id,true)))
WITH CHECK ((SELECT exam_results_private.can_admin_view_result_set(exam_result_set_id,true)));
CREATE POLICY exam_student_results_admin_delete ON public.exam_student_results FOR DELETE TO authenticated
USING ((SELECT exam_results_private.can_admin_view_result_set(exam_result_set_id,true)));
CREATE POLICY exam_student_results_student_select ON public.exam_student_results FOR SELECT TO authenticated
USING ((SELECT exam_results_private.can_student_view_result(id)));
CREATE POLICY exam_student_results_parent_select ON public.exam_student_results FOR SELECT TO authenticated
USING ((SELECT exam_results_private.can_parent_view_result(id)));

COMMIT;
