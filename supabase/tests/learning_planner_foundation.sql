-- Transactional verification for Module 06A. Safe to run against a populated project.
BEGIN;

DO $$
DECLARE
  required_table text;
  required_function text;
BEGIN
  FOREACH required_table IN ARRAY ARRAY[
    'class_schedules', 'schedule_events', 'schedule_changes',
    'notifications', 'notification_recipients'
  ] LOOP
    IF to_regclass('public.' || required_table) IS NULL THEN
      RAISE EXCEPTION 'Missing Learning Planner table: %', required_table;
    END IF;
  END LOOP;

  FOREACH required_function IN ARRAY ARRAY[
    'create_schedule_event', 'reschedule_schedule_event',
    'cancel_schedule_event', 'complete_schedule_event',
    'mark_schedule_notification_read'
  ] LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public' AND p.proname = required_function
    ) THEN
      RAISE EXCEPTION 'Missing Learning Planner RPC: %', required_function;
    END IF;
  END LOOP;

  IF EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname IN ('class_schedules','schedule_events','schedule_changes','notifications','notification_recipients')
      AND NOT c.relrowsecurity
  ) THEN
    RAISE EXCEPTION 'RLS is not enabled on every Learning Planner table';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='schedule_events_batch_conflict_idx')
     OR NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='schedule_events_room_conflict_idx') THEN
    RAISE EXCEPTION 'Required conflict indexes are missing';
  END IF;
END $$;

ROLLBACK;
