BEGIN;

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

  -- Remove batch-level overlap approvals
  DELETE FROM public.batch_schedule_overlap_approvals
  WHERE institute_id = v_profile.institute_id
    AND (
      proposed_batch_id = p_batch_id
      OR conflicting_batch_id = p_batch_id
    );

  -- Remove planner overlap approvals that reference the batch, events, or class schedules
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
      OR conflicting_event_id IN (
        SELECT id
        FROM public.schedule_events
        WHERE institute_id = v_profile.institute_id
          AND batch_id = p_batch_id
      )
      OR conflicting_class_schedule_id IN (
        SELECT id
        FROM public.class_schedules
        WHERE institute_id = v_profile.institute_id
          AND batch_id = p_batch_id
      )
    );

  -- Planner outbox tied to schedule events
  DELETE FROM public.planner_message_outbox
  WHERE institute_id = v_profile.institute_id
    AND schedule_event_id IN (
      SELECT id
      FROM public.schedule_events
      WHERE institute_id = v_profile.institute_id
        AND batch_id = p_batch_id
    );

  -- Notifications and recipients for events
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

  -- Schedule changes for events
  DELETE FROM public.schedule_changes
  WHERE schedule_event_id IN (
    SELECT id
    FROM public.schedule_events
    WHERE institute_id = v_profile.institute_id
      AND batch_id = p_batch_id
  );

  -- Practice attempts must be removed before practice assignments
  DELETE FROM public.practice_attempts
  WHERE practice_assignment_id IN (
    SELECT pa.id
    FROM public.practice_assignments pa
    WHERE pa.institute_id = v_profile.institute_id
      AND pa.batch_id = p_batch_id
  );

  -- Practice sets tied to schedule events
  DELETE FROM public.practice_sets
  WHERE institute_id = v_profile.institute_id
    AND schedule_event_id IN (
      SELECT id
      FROM public.schedule_events
      WHERE institute_id = v_profile.institute_id
        AND batch_id = p_batch_id
    );

  -- Practice assignments
  DELETE FROM public.practice_assignments
  WHERE institute_id = v_profile.institute_id
    AND batch_id = p_batch_id;

  -- Exam student results tied to either exam_result_sets or student_assignments
  DELETE FROM public.exam_student_results
  WHERE institute_id = v_profile.institute_id
    AND (
      exam_result_set_id IN (
        SELECT id
        FROM public.exam_result_sets
        WHERE institute_id = v_profile.institute_id
          AND batch_id = p_batch_id
      )
      OR student_assignment_id IN (
        SELECT id
        FROM public.student_assignments
        WHERE institute_id = v_profile.institute_id
          AND batch_id = p_batch_id
      )
    );

  -- Student attendance referencing student_assignments
  DELETE FROM public.student_attendance
  WHERE institute_id = v_profile.institute_id
    AND student_assignment_id IN (
      SELECT id
      FROM public.student_assignments
      WHERE institute_id = v_profile.institute_id
        AND batch_id = p_batch_id
    );

  -- Before deleting any exam_result_sets: ensure no external exam_result_sets.supersedes reference these (would block deletion)
  IF EXISTS (
    SELECT 1
    FROM public.exam_result_sets ers2
    WHERE ers2.institute_id = v_profile.institute_id
      AND ers2.batch_id IS DISTINCT FROM p_batch_id
      AND ers2.supersedes_result_set_id IN (
        SELECT id FROM public.exam_result_sets WHERE institute_id = v_profile.institute_id AND batch_id = p_batch_id
      )
  ) THEN
    RAISE EXCEPTION 'BATCH_DELETE_BLOCKED_BY_EXTERNAL_EXAM_SUPERSEDES';
  END IF;

  -- Clear supersedes links within the batch to avoid self-referencing RESTRICT
  UPDATE public.exam_result_sets ers
  SET supersedes_result_set_id = NULL
  WHERE ers.institute_id = v_profile.institute_id
    AND ers.batch_id = p_batch_id
    AND ers.supersedes_result_set_id IN (
      SELECT id
      FROM public.exam_result_sets
      WHERE institute_id = v_profile.institute_id
        AND batch_id = p_batch_id
    );

  -- Clear schedule_events self references (only for rows being deleted)
  -- Ensure no external schedule_events reference events in this batch (would block deletion)
  IF EXISTS (
    SELECT 1
    FROM public.schedule_events se2
    WHERE se2.institute_id = v_profile.institute_id
      AND se2.batch_id IS DISTINCT FROM p_batch_id
      AND (
        se2.original_event_id IN (
          SELECT id FROM public.schedule_events WHERE institute_id = v_profile.institute_id AND batch_id = p_batch_id
        )
        OR se2.related_event_id IN (
          SELECT id FROM public.schedule_events WHERE institute_id = v_profile.institute_id AND batch_id = p_batch_id
        )
      )
  ) THEN
    RAISE EXCEPTION 'BATCH_DELETE_BLOCKED_BY_EXTERNAL_EVENT_REFERENCES';
  END IF;

  -- Clear schedule_events self references (only among rows being deleted)
  UPDATE public.schedule_events se
  SET original_event_id = NULL
  WHERE se.institute_id = v_profile.institute_id
    AND se.batch_id = p_batch_id
    AND se.original_event_id IN (
      SELECT id
      FROM public.schedule_events
      WHERE institute_id = v_profile.institute_id
        AND batch_id = p_batch_id
    );

  UPDATE public.schedule_events se
  SET related_event_id = NULL
  WHERE se.institute_id = v_profile.institute_id
    AND se.batch_id = p_batch_id
    AND se.related_event_id IN (
      SELECT id
      FROM public.schedule_events
      WHERE institute_id = v_profile.institute_id
        AND batch_id = p_batch_id
    );

  -- Exam result sets (after clearing internal supersedes)
  DELETE FROM public.exam_result_sets
  WHERE institute_id = v_profile.institute_id
    AND batch_id = p_batch_id;

  -- Student assignments and related student_batches
  DELETE FROM public.student_assignments
  WHERE institute_id = v_profile.institute_id
    AND batch_id = p_batch_id;

  -- Corrected: student_batches has no institute_id in live schema, delete by batch_id only
  DELETE FROM public.student_batches
  WHERE batch_id = p_batch_id;

  -- Schedule events (after clearing self references and all event children)
  DELETE FROM public.schedule_events
  WHERE institute_id = v_profile.institute_id
    AND batch_id = p_batch_id;

  -- Class schedules (delete after schedule_events to satisfy FK: schedule_events.class_schedule_id -> class_schedules.id ON DELETE RESTRICT)
  DELETE FROM public.class_schedules
  WHERE institute_id = v_profile.institute_id
    AND batch_id = p_batch_id;

  -- Finally delete the batch
  DELETE FROM public.batches
  WHERE id = p_batch_id
    AND institute_id = v_profile.institute_id;

  RETURN FOUND;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_teaching_batch(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_teaching_batch(uuid) TO authenticated;

COMMIT;
