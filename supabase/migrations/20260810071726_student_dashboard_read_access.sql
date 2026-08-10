BEGIN;

CREATE POLICY students_student_self_select ON public.students FOR SELECT TO authenticated
USING (profile_id = (SELECT auth.uid()) AND EXISTS (
  SELECT 1 FROM public.profiles p
  WHERE p.id = (SELECT auth.uid()) AND p.institute_id = students.institute_id
    AND p.role = 'Student' AND p.is_active IS TRUE
));

CREATE POLICY student_assignments_student_self_select ON public.student_assignments FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.students s
  WHERE s.id = student_assignments.student_id
    AND s.institute_id = student_assignments.institute_id
    AND s.profile_id = (SELECT auth.uid())
));

CREATE POLICY student_attendance_student_self_select ON public.student_attendance FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.students s
  WHERE s.id = student_attendance.student_id
    AND s.institute_id = student_attendance.institute_id
    AND s.profile_id = (SELECT auth.uid())
));

DROP POLICY IF EXISTS notifications_recipient_select ON public.notifications;
CREATE POLICY notifications_recipient_select ON public.notifications FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.notification_recipients nr
  WHERE nr.notification_id = notifications.id
    AND nr.institute_id = notifications.institute_id
    AND nr.user_id = (SELECT auth.uid())
));

COMMIT;
