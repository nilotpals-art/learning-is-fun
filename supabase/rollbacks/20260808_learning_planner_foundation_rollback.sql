BEGIN;

DROP FUNCTION IF EXISTS public.mark_schedule_notification_read(uuid);
DROP FUNCTION IF EXISTS public.complete_schedule_event(uuid);
DROP FUNCTION IF EXISTS public.cancel_schedule_event(uuid,text);
DROP FUNCTION IF EXISTS public.reschedule_schedule_event(uuid,date,time,time,text);
DROP FUNCTION IF EXISTS public.create_schedule_event(jsonb);

DROP POLICY IF EXISTS notifications_recipient_select ON public.notifications;
DROP TABLE IF EXISTS public.notification_recipients;
DROP TABLE IF EXISTS public.notifications;
DROP TABLE IF EXISTS public.schedule_changes;
DROP TABLE IF EXISTS public.schedule_events;
DROP TABLE IF EXISTS public.class_schedules;

DROP FUNCTION IF EXISTS public.learning_planner_admin_scope(uuid,uuid);
DROP FUNCTION IF EXISTS public.learning_planner_set_updated_at();

ALTER TABLE public.subjects DROP CONSTRAINT IF EXISTS subjects_id_institute_id_key;
ALTER TABLE public.batches DROP CONSTRAINT IF EXISTS batches_id_institute_id_key;
ALTER TABLE public.branches DROP CONSTRAINT IF EXISTS branches_id_institute_id_key;

COMMIT;
