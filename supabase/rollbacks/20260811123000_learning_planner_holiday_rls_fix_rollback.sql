BEGIN;
DROP POLICY learning_planner_public_holidays_select ON public.learning_planner_public_holidays;
CREATE POLICY learning_planner_public_holidays_select ON public.learning_planner_public_holidays
FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.profiles p WHERE p.id=(SELECT auth.uid()) AND p.is_active IS TRUE AND p.institute_id=institute_id AND (branch_id IS NULL OR p.branch_id IS NULL OR p.branch_id=branch_id))
);
COMMIT;
