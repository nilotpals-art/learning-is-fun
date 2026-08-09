BEGIN;

REVOKE ALL ON FUNCTION public.generate_schedule_events(date,date,uuid,uuid)
  FROM PUBLIC, anon, authenticated;
DROP FUNCTION public.generate_schedule_events(date,date,uuid,uuid);
DROP INDEX public.schedule_events_generated_occurrence_key;

COMMIT;
