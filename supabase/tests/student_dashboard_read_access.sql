BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'students'
      AND policyname = 'students_student_self_select'
  ) THEN
    RAISE EXCEPTION 'Student self-read policy is missing';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'student_assignments'
      AND policyname = 'student_assignments_student_self_select'
  ) THEN
    RAISE EXCEPTION 'Student assignment self-read policy is missing';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'student_attendance'
      AND policyname = 'student_attendance_student_self_select'
  ) THEN
    RAISE EXCEPTION 'Student attendance self-read policy is missing';
  END IF;
END $$;

ROLLBACK;
