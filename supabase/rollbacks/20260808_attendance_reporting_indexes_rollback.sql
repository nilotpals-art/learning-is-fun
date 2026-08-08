BEGIN;

DROP INDEX IF EXISTS public.student_attendance_status_range_idx;
DROP INDEX IF EXISTS public.student_attendance_academic_year_range_idx;
DROP INDEX IF EXISTS public.student_attendance_batch_range_idx;
DROP INDEX IF EXISTS public.student_attendance_history_cursor_idx;

COMMIT;
