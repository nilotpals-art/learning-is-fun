BEGIN;

-- Restore the previously deployed Module 06B function before removing its durable dependency.
-- The full prior definition is retained in 20260808170921_learning_planner_schedule_materialization.sql.
DROP FUNCTION public.generate_schedule_events(date,date,uuid,uuid);
DROP TABLE public.learning_planner_public_holidays;
DROP TABLE public.learning_planner_holiday_settings;

COMMIT;
