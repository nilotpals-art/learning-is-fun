BEGIN;

-- Rollback: restore the delete_teaching_batch function to its pre-cleanup state (migration 20260815153000)
CREATE OR REPLACE FUNCTION public.delete_teaching_batch(p_batch_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_profile public.profiles%ROWTYPE;
BEGIN
  SELECT * INTO v_profile
  FROM public.profiles
  WHERE id = (SELECT auth.uid())
    AND is_active IS TRUE
    AND role IN ('Administrator', 'Super Admin', 'admin', 'Institute Admin');

  IF v_profile.id IS NULL THEN
    RAISE EXCEPTION 'BATCH_UNAUTHORIZED';
  END IF;

  DELETE FROM public.batch_schedule_overlap_approvals
  WHERE institute_id = v_profile.institute_id
    AND (
      proposed_batch_id = p_batch_id
      OR conflicting_batch_id = p_batch_id
    );

  DELETE FROM public.planner_event_overlap_approvals
  WHERE institute_id = v_profile.institute_id
    AND (
      conflicting_batch_id = p_batch_id
      OR event_id IN (
        SELECT id
        FROM public.schedule_events
        WHERE institute_id = v_profile.institute_id
          AND batch_id = p_batch_id
      )
      OR source_event_id IN (
        SELECT id
        FROM public.schedule_events
        WHERE institute_id = v_profile.institute_id
          AND batch_id = p_batch_id
      )
    );

  DELETE FROM public.planner_message_outbox
  WHERE institute_id = v_profile.institute_id
    AND schedule_event_id IN (
      SELECT id
      FROM public.schedule_events
      WHERE institute_id = v_profile.institute_id
        AND batch_id = p_batch_id
    );

  DELETE FROM public.notification_recipients
  WHERE institute_id = v_profile.institute_id
    AND notification_id IN (
      SELECT n.id
      FROM public.notifications n
      WHERE n.institute_id = v_profile.institute_id
        AND n.schedule_event_id IN (
          SELECT id
          FROM public.schedule_events
          WHERE institute_id = v_profile.institute_id
            AND batch_id = p_batch_id
        )
    );

  DELETE FROM public.notifications
  WHERE institute_id = v_profile.institute_id
    AND schedule_event_id IN (
      SELECT id
      FROM public.schedule_events
      WHERE institute_id = v_profile.institute_id
        AND batch_id = p_batch_id
    );

  DELETE FROM public.schedule_changes
  WHERE schedule_event_id IN (
    SELECT id
    FROM public.schedule_events
    WHERE institute_id = v_profile.institute_id
      AND batch_id = p_batch_id
  );

  DELETE FROM public.practice_assignments
  WHERE institute_id = v_profile.institute_id
    AND batch_id = p_batch_id;

  DELETE FROM public.exam_result_sets
  WHERE institute_id = v_profile.institute_id
    AND batch_id = p_batch_id;

  DELETE FROM public.student_assignments
  WHERE institute_id = v_profile.institute_id
    AND batch_id = p_batch_id;

  -- student_batches has no institute_id column, delete by batch_id only
  DELETE FROM public.student_batches
  WHERE batch_id = p_batch_id;

  DELETE FROM public.schedule_events
  WHERE institute_id = v_profile.institute_id
    AND batch_id = p_batch_id;

  DELETE FROM public.class_schedules
  WHERE institute_id = v_profile.institute_id
    AND batch_id = p_batch_id;

  DELETE FROM public.batches
  WHERE id = p_batch_id
    AND institute_id = v_profile.institute_id;

  RETURN FOUND;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_teaching_batch(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_teaching_batch(uuid) TO authenticated;

COMMIT;