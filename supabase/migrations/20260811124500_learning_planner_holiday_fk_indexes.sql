BEGIN;
CREATE INDEX IF NOT EXISTS learning_planner_public_holidays_branch_fk_idx ON public.learning_planner_public_holidays (branch_id, institute_id);
CREATE INDEX IF NOT EXISTS learning_planner_public_holidays_creator_fk_idx ON public.learning_planner_public_holidays (created_by, institute_id);
COMMIT;
