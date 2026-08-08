BEGIN;

CREATE INDEX student_attendance_assignment_reference_idx
  ON public.student_attendance (
    student_assignment_id,
    institute_id,
    student_id,
    academic_year_id,
    batch_id
  );

CREATE INDEX student_attendance_marker_institute_idx
  ON public.student_attendance (marked_by, institute_id);

COMMIT;
