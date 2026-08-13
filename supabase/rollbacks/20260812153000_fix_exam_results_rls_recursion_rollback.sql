BEGIN;
DROP POLICY exam_result_sets_student_select ON public.exam_result_sets;
DROP POLICY exam_result_sets_parent_select ON public.exam_result_sets;
DROP POLICY exam_student_results_admin_select ON public.exam_student_results;
DROP POLICY exam_student_results_admin_insert ON public.exam_student_results;
DROP POLICY exam_student_results_admin_update ON public.exam_student_results;
DROP POLICY exam_student_results_admin_delete ON public.exam_student_results;
DROP POLICY exam_student_results_student_select ON public.exam_student_results;
DROP POLICY exam_student_results_parent_select ON public.exam_student_results;

CREATE POLICY exam_result_sets_student_select ON public.exam_result_sets FOR SELECT TO authenticated USING (status='published' AND EXISTS (SELECT 1 FROM public.exam_student_results r JOIN public.students s ON s.id=r.student_id AND s.institute_id=r.institute_id WHERE r.exam_result_set_id=exam_result_sets.id AND s.profile_id=(SELECT auth.uid())));
CREATE POLICY exam_result_sets_parent_select ON public.exam_result_sets FOR SELECT TO authenticated USING (status='published' AND EXISTS (SELECT 1 FROM public.exam_student_results r JOIN public.student_parent_links l ON l.student_id=r.student_id AND l.institute_id=r.institute_id JOIN public.parents p ON p.id=l.parent_id AND p.institute_id=l.institute_id WHERE r.exam_result_set_id=exam_result_sets.id AND p.profile_id=(SELECT auth.uid()) AND p.is_active IS TRUE));
CREATE POLICY exam_student_results_admin_select ON public.exam_student_results FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.exam_result_sets rs JOIN public.schedule_events e ON e.id=rs.schedule_event_id WHERE rs.id=exam_result_set_id AND public.learning_planner_admin_scope(e.institute_id,e.branch_id)));
CREATE POLICY exam_student_results_admin_insert ON public.exam_student_results FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.exam_result_sets rs JOIN public.schedule_events e ON e.id=rs.schedule_event_id WHERE rs.id=exam_result_set_id AND rs.status='draft' AND public.learning_planner_admin_scope(e.institute_id,e.branch_id)));
CREATE POLICY exam_student_results_admin_update ON public.exam_student_results FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.exam_result_sets rs JOIN public.schedule_events e ON e.id=rs.schedule_event_id WHERE rs.id=exam_result_set_id AND rs.status='draft' AND public.learning_planner_admin_scope(e.institute_id,e.branch_id))) WITH CHECK (EXISTS (SELECT 1 FROM public.exam_result_sets rs JOIN public.schedule_events e ON e.id=rs.schedule_event_id WHERE rs.id=exam_result_set_id AND rs.status='draft' AND public.learning_planner_admin_scope(e.institute_id,e.branch_id)));
CREATE POLICY exam_student_results_admin_delete ON public.exam_student_results FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM public.exam_result_sets rs JOIN public.schedule_events e ON e.id=rs.schedule_event_id WHERE rs.id=exam_result_set_id AND rs.status='draft' AND public.learning_planner_admin_scope(e.institute_id,e.branch_id)));
CREATE POLICY exam_student_results_student_select ON public.exam_student_results FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.exam_result_sets rs JOIN public.students s ON s.id=student_id AND s.institute_id=institute_id WHERE rs.id=exam_result_set_id AND rs.status='published' AND s.profile_id=(SELECT auth.uid())));
CREATE POLICY exam_student_results_parent_select ON public.exam_student_results FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.exam_result_sets rs JOIN public.student_parent_links l ON l.student_id=student_id AND l.institute_id=institute_id JOIN public.parents p ON p.id=l.parent_id AND p.institute_id=l.institute_id WHERE rs.id=exam_result_set_id AND rs.status='published' AND p.profile_id=(SELECT auth.uid()) AND p.is_active IS TRUE));

DROP FUNCTION exam_results_private.can_parent_view_result(uuid);
DROP FUNCTION exam_results_private.can_student_view_result(uuid);
DROP FUNCTION exam_results_private.can_parent_view_result_set(uuid);
DROP FUNCTION exam_results_private.can_student_view_result_set(uuid);
DROP FUNCTION exam_results_private.can_admin_view_result_set(uuid,boolean);
DROP SCHEMA exam_results_private;
COMMIT;
