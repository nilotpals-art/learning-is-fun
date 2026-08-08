BEGIN;

DROP FUNCTION IF EXISTS public.update_student_attendance(uuid, text, text);
DROP FUNCTION IF EXISTS public.save_daily_attendance(date, uuid, uuid, jsonb);

DROP POLICY IF EXISTS student_attendance_admin_select
  ON public.student_attendance;
ALTER TABLE public.student_attendance DISABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.student_attendance FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.student_attendance TO anon, authenticated;

DROP INDEX IF EXISTS public.student_attendance_institute_date_batch_idx;

ALTER TABLE public.student_attendance
  DROP CONSTRAINT student_attendance_marked_by_institute_fkey,
  ADD CONSTRAINT student_attendance_marked_by_fkey
    FOREIGN KEY (marked_by) REFERENCES public.profiles (id),
  DROP CONSTRAINT student_attendance_assignment_fkey,
  DROP CONSTRAINT student_attendance_status_check,
  ADD CONSTRAINT student_attendance_status_check
    CHECK (status IN (
      'Present',
      'Absent',
      'Late',
      'Leave',
      'Holiday',
      'Class Rescheduled'
    )),
  ALTER COLUMN marked_by DROP NOT NULL,
  ALTER COLUMN created_at DROP NOT NULL,
  ALTER COLUMN updated_at DROP NOT NULL,
  DROP COLUMN batch_id,
  DROP COLUMN academic_year_id,
  DROP COLUMN student_assignment_id;

ALTER TABLE public.profiles
  DROP CONSTRAINT profiles_id_institute_id_key;
ALTER TABLE public.student_assignments
  DROP CONSTRAINT student_assignments_attendance_reference_key;

COMMIT;
