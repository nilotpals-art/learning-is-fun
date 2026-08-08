BEGIN;

CREATE INDEX student_attendance_history_cursor_idx
  ON public.student_attendance (institute_id, attendance_date DESC, id DESC);
CREATE INDEX student_attendance_batch_range_idx
  ON public.student_attendance (institute_id, batch_id, attendance_date DESC);
CREATE INDEX student_attendance_academic_year_range_idx
  ON public.student_attendance (institute_id, academic_year_id, attendance_date DESC);
CREATE INDEX student_attendance_status_range_idx
  ON public.student_attendance (institute_id, status, attendance_date DESC);

COMMIT;
