BEGIN;
DROP INDEX IF EXISTS public.learning_planner_public_holidays_creator_fk_idx;
DROP INDEX IF EXISTS public.learning_planner_public_holidays_branch_fk_idx;
COMMIT;
