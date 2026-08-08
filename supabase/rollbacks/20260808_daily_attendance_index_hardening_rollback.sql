BEGIN;

DROP INDEX IF EXISTS public.student_attendance_marker_institute_idx;
DROP INDEX IF EXISTS public.student_attendance_assignment_reference_idx;

COMMIT;
