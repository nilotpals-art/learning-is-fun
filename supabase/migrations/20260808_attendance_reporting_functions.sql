BEGIN;

CREATE FUNCTION public.student_attendance_summary(
  p_institute_id uuid,
  p_student_id uuid,
  p_academic_year_id uuid DEFAULT NULL,
  p_date_from date DEFAULT NULL,
  p_date_to date DEFAULT NULL
)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
  WITH filtered AS (
    SELECT a.attendance_date, a.status, a.remarks, a.academic_year_id, a.batch_id
    FROM public.student_attendance a
    WHERE a.institute_id = p_institute_id
      AND a.student_id = p_student_id
      AND (p_academic_year_id IS NULL OR a.academic_year_id = p_academic_year_id)
      AND (p_date_from IS NULL OR a.attendance_date >= p_date_from)
      AND (p_date_to IS NULL OR a.attendance_date <= p_date_to)
  ), totals AS (
    SELECT count(*)::integer AS total,
      count(*) FILTER (WHERE status = 'Present')::integer AS present,
      count(*) FILTER (WHERE status = 'Absent')::integer AS absent,
      count(*) FILTER (WHERE status = 'Late')::integer AS late,
      count(*) FILTER (WHERE status = 'Leave')::integer AS leave
    FROM filtered
  )
  SELECT jsonb_build_object(
    'total', t.total, 'present', t.present, 'absent', t.absent,
    'late', t.late, 'leave', t.leave,
    'percentage', CASE WHEN t.total = 0 THEN NULL
      ELSE round(((t.present + t.late)::numeric * 100) / t.total, 1) END,
    'calendar', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'date', f.attendance_date, 'status', f.status, 'remarks', f.remarks,
        'academicYearId', f.academic_year_id, 'batchId', f.batch_id
      ) ORDER BY f.attendance_date)
      FROM filtered f
    ), '[]'::jsonb)
  ) FROM totals t;
$$;

CREATE FUNCTION public.batch_attendance_summary(
  p_institute_id uuid,
  p_batch_id uuid,
  p_academic_year_id uuid DEFAULT NULL,
  p_date_from date DEFAULT NULL,
  p_date_to date DEFAULT NULL
)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
  WITH filtered AS (
    SELECT a.student_id, a.status
    FROM public.student_attendance a
    WHERE a.institute_id = p_institute_id AND a.batch_id = p_batch_id
      AND (p_academic_year_id IS NULL OR a.academic_year_id = p_academic_year_id)
      AND (p_date_from IS NULL OR a.attendance_date >= p_date_from)
      AND (p_date_to IS NULL OR a.attendance_date <= p_date_to)
  ), student_totals AS (
    SELECT f.student_id, s.admission_no, s.name,
      count(*)::integer AS total,
      count(*) FILTER (WHERE f.status = 'Present')::integer AS present,
      count(*) FILTER (WHERE f.status = 'Absent')::integer AS absent,
      count(*) FILTER (WHERE f.status = 'Late')::integer AS late,
      count(*) FILTER (WHERE f.status = 'Leave')::integer AS leave
    FROM filtered f
    JOIN public.students s ON s.id = f.student_id AND s.institute_id = p_institute_id
    GROUP BY f.student_id, s.admission_no, s.name
  ), totals AS (
    SELECT count(DISTINCT student_id)::integer AS students,
      COALESCE(sum(total), 0)::integer AS total,
      COALESCE(sum(present), 0)::integer AS present,
      COALESCE(sum(absent), 0)::integer AS absent,
      COALESCE(sum(late), 0)::integer AS late,
      COALESCE(sum(leave), 0)::integer AS leave
    FROM student_totals
  )
  SELECT jsonb_build_object(
    'students', t.students, 'total', t.total, 'present', t.present,
    'absent', t.absent, 'late', t.late, 'leave', t.leave,
    'percentage', CASE WHEN t.total = 0 THEN NULL
      ELSE round(((t.present + t.late)::numeric * 100) / t.total, 1) END,
    'rows', COALESCE((SELECT jsonb_agg(jsonb_build_object(
      'studentId', st.student_id, 'admissionNumber', st.admission_no,
      'studentName', st.name, 'total', st.total, 'present', st.present,
      'absent', st.absent, 'late', st.late, 'leave', st.leave,
      'percentage', CASE WHEN st.total = 0 THEN NULL
        ELSE round(((st.present + st.late)::numeric * 100) / st.total, 1) END
    ) ORDER BY st.name) FROM student_totals st), '[]'::jsonb)
  ) FROM totals t;
$$;

CREATE FUNCTION public.daily_attendance_summary(
  p_institute_id uuid,
  p_attendance_date date,
  p_batch_id uuid
)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
  WITH filtered AS (
    SELECT a.status, a.remarks, s.admission_no, s.name
    FROM public.student_attendance a
    JOIN public.students s ON s.id = a.student_id AND s.institute_id = a.institute_id
    WHERE a.institute_id = p_institute_id
      AND a.attendance_date = p_attendance_date AND a.batch_id = p_batch_id
  ), totals AS (
    SELECT count(*)::integer AS total,
      count(*) FILTER (WHERE status = 'Present')::integer AS present,
      count(*) FILTER (WHERE status = 'Absent')::integer AS absent,
      count(*) FILTER (WHERE status = 'Late')::integer AS late,
      count(*) FILTER (WHERE status = 'Leave')::integer AS leave
    FROM filtered
  )
  SELECT jsonb_build_object(
    'total', t.total, 'present', t.present, 'absent', t.absent,
    'late', t.late, 'leave', t.leave,
    'percentage', CASE WHEN t.total = 0 THEN NULL
      ELSE round(((t.present + t.late)::numeric * 100) / t.total, 1) END,
    'rows', COALESCE((SELECT jsonb_agg(jsonb_build_object(
      'admissionNumber', f.admission_no, 'studentName', f.name,
      'status', f.status, 'remarks', f.remarks
    ) ORDER BY f.name) FROM filtered f), '[]'::jsonb)
  ) FROM totals t;
$$;

CREATE FUNCTION public.academic_year_attendance_summary(
  p_institute_id uuid,
  p_academic_year_id uuid,
  p_date_from date DEFAULT NULL,
  p_date_to date DEFAULT NULL
)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
  WITH filtered AS (
    SELECT a.batch_id, a.status
    FROM public.student_attendance a
    WHERE a.institute_id = p_institute_id AND a.academic_year_id = p_academic_year_id
      AND (p_date_from IS NULL OR a.attendance_date >= p_date_from)
      AND (p_date_to IS NULL OR a.attendance_date <= p_date_to)
  ), batch_totals AS (
    SELECT f.batch_id, b.name,
      count(*)::integer AS total,
      count(*) FILTER (WHERE f.status = 'Present')::integer AS present,
      count(*) FILTER (WHERE f.status = 'Absent')::integer AS absent,
      count(*) FILTER (WHERE f.status = 'Late')::integer AS late,
      count(*) FILTER (WHERE f.status = 'Leave')::integer AS leave
    FROM filtered f JOIN public.batches b ON b.id = f.batch_id AND b.institute_id = p_institute_id
    GROUP BY f.batch_id, b.name
  ), totals AS (
    SELECT COALESCE(sum(total), 0)::integer AS total,
      COALESCE(sum(present), 0)::integer AS present,
      COALESCE(sum(absent), 0)::integer AS absent,
      COALESCE(sum(late), 0)::integer AS late,
      COALESCE(sum(leave), 0)::integer AS leave
    FROM batch_totals
  )
  SELECT jsonb_build_object(
    'total', t.total, 'present', t.present, 'absent', t.absent,
    'late', t.late, 'leave', t.leave,
    'percentage', CASE WHEN t.total = 0 THEN NULL
      ELSE round(((t.present + t.late)::numeric * 100) / t.total, 1) END,
    'batches', COALESCE((SELECT jsonb_agg(jsonb_build_object(
      'batchId', bt.batch_id, 'batchName', bt.name, 'total', bt.total,
      'present', bt.present, 'absent', bt.absent, 'late', bt.late,
      'leave', bt.leave, 'percentage', CASE WHEN bt.total = 0 THEN NULL
        ELSE round(((bt.present + bt.late)::numeric * 100) / bt.total, 1) END
    ) ORDER BY bt.name) FROM batch_totals bt), '[]'::jsonb)
  ) FROM totals t;
$$;

CREATE FUNCTION public.attendance_status_summary(
  p_institute_id uuid,
  p_status text,
  p_date_from date DEFAULT NULL,
  p_date_to date DEFAULT NULL
)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT jsonb_build_object(
    'status', p_status,
    'total', count(*)::integer,
    'students', count(DISTINCT a.student_id)::integer,
    'days', count(DISTINCT a.attendance_date)::integer
  )
  FROM public.student_attendance a
  WHERE a.institute_id = p_institute_id AND a.status = p_status
    AND p_status IN ('Present', 'Absent', 'Late', 'Leave')
    AND (p_date_from IS NULL OR a.attendance_date >= p_date_from)
    AND (p_date_to IS NULL OR a.attendance_date <= p_date_to);
$$;

REVOKE ALL ON FUNCTION public.student_attendance_summary(uuid, uuid, uuid, date, date) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.batch_attendance_summary(uuid, uuid, uuid, date, date) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.daily_attendance_summary(uuid, date, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.academic_year_attendance_summary(uuid, uuid, date, date) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.attendance_status_summary(uuid, text, date, date) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.student_attendance_summary(uuid, uuid, uuid, date, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.batch_attendance_summary(uuid, uuid, uuid, date, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.daily_attendance_summary(uuid, date, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.academic_year_attendance_summary(uuid, uuid, date, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.attendance_status_summary(uuid, text, date, date) TO authenticated;

COMMIT;
