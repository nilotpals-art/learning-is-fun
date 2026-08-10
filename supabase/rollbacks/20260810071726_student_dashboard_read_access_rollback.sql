BEGIN;

DROP POLICY IF EXISTS students_student_self_select ON public.students;
DROP POLICY IF EXISTS student_assignments_student_self_select ON public.student_assignments;
DROP POLICY IF EXISTS student_attendance_student_self_select ON public.student_attendance;

DROP POLICY IF EXISTS notifications_recipient_select ON public.notifications;
CREATE POLICY notifications_recipient_select
ON public.notifications
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.notification_recipients nr
    WHERE nr.notification_id = nr.id
      AND nr.user_id = (SELECT auth.uid())
  )
);

COMMIT;
