BEGIN;
CREATE FUNCTION public.get_published_exam_result_stats(p_result_set_ids uuid[])
RETURNS TABLE(result_set_id uuid,highest_marks numeric,lowest_marks numeric,average_marks numeric)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
SELECT r.exam_result_set_id,max(r.marks_obtained),min(r.marks_obtained),avg(r.marks_obtained) FROM public.exam_student_results r JOIN public.exam_result_sets rs ON rs.id=r.exam_result_set_id WHERE r.exam_result_set_id=ANY(p_result_set_ids) AND rs.status='published' AND (EXISTS(SELECT 1 FROM public.students s WHERE s.id=r.student_id AND s.profile_id=(SELECT auth.uid())) OR EXISTS(SELECT 1 FROM public.student_parent_links l JOIN public.parents p ON p.id=l.parent_id AND p.institute_id=l.institute_id WHERE l.student_id=r.student_id AND l.institute_id=r.institute_id AND p.profile_id=(SELECT auth.uid()) AND p.is_active IS TRUE) OR EXISTS(SELECT 1 FROM public.schedule_events e WHERE e.id=rs.schedule_event_id AND public.learning_planner_admin_scope(e.institute_id,e.branch_id))) GROUP BY r.exam_result_set_id;
$$;
REVOKE ALL ON FUNCTION public.get_published_exam_result_stats(uuid[]) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.get_published_exam_result_stats(uuid[]) TO authenticated;
COMMIT;
