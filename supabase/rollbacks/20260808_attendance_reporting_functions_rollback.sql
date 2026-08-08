BEGIN;

DROP FUNCTION IF EXISTS public.attendance_status_summary(uuid, text, date, date);
DROP FUNCTION IF EXISTS public.academic_year_attendance_summary(uuid, uuid, date, date);
DROP FUNCTION IF EXISTS public.daily_attendance_summary(uuid, date, uuid);
DROP FUNCTION IF EXISTS public.batch_attendance_summary(uuid, uuid, uuid, date, date);
DROP FUNCTION IF EXISTS public.student_attendance_summary(uuid, uuid, uuid, date, date);

COMMIT;
