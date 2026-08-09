BEGIN;

CREATE UNIQUE INDEX schedule_events_generated_occurrence_key
  ON public.schedule_events (class_schedule_id, event_date)
  WHERE class_schedule_id IS NOT NULL AND original_event_id IS NULL;

CREATE FUNCTION public.generate_schedule_events(
  p_from_date date,
  p_to_date date,
  p_batch_id uuid DEFAULT NULL,
  p_class_schedule_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_profile public.profiles%ROWTYPE;
  v_occurrence record;
  v_event_id uuid;
  v_existing_count integer := 0;
  v_generated_count integer := 0;
  v_conflict_count integer := 0;
  v_candidate_count integer := 0;
  v_inactive_count integer := 0;
  v_outside_count integer := 0;
  v_conflict_type text;
  v_conflicting_event_id uuid;
  v_generated_ids jsonb := '[]'::jsonb;
  v_conflicts jsonb := '[]'::jsonb;
BEGIN
  IF p_from_date IS NULL OR p_to_date IS NULL THEN
    RAISE EXCEPTION 'PLANNER_GENERATION_DATES_REQUIRED';
  END IF;
  IF p_from_date > p_to_date THEN
    RAISE EXCEPTION 'PLANNER_GENERATION_RANGE_INVALID';
  END IF;
  IF p_to_date - p_from_date > 89 THEN
    RAISE EXCEPTION 'PLANNER_GENERATION_RANGE_TOO_LARGE';
  END IF;

  SELECT * INTO v_profile
  FROM public.profiles
  WHERE id = (SELECT auth.uid()) AND is_active IS TRUE;

  IF v_profile.id IS NULL OR NOT public.learning_planner_admin_scope(v_profile.institute_id, v_profile.branch_id) THEN
    RAISE EXCEPTION 'PLANNER_UNAUTHORIZED';
  END IF;

  IF p_batch_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.batches b
    WHERE b.id = p_batch_id AND b.institute_id = v_profile.institute_id
  ) THEN
    RAISE EXCEPTION 'PLANNER_BATCH_INVALID';
  END IF;

  IF p_class_schedule_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.class_schedules cs
    WHERE cs.id = p_class_schedule_id
      AND cs.institute_id = v_profile.institute_id
      AND (v_profile.branch_id IS NULL OR cs.branch_id = v_profile.branch_id)
  ) THEN
    RAISE EXCEPTION 'PLANNER_SCHEDULE_NOT_FOUND';
  END IF;

  SELECT count(*) INTO v_inactive_count
  FROM public.class_schedules cs
  WHERE cs.institute_id = v_profile.institute_id
    AND (v_profile.branch_id IS NULL OR cs.branch_id = v_profile.branch_id)
    AND (p_batch_id IS NULL OR cs.batch_id = p_batch_id)
    AND (p_class_schedule_id IS NULL OR cs.id = p_class_schedule_id)
    AND cs.is_active IS FALSE;

  SELECT count(*) INTO v_outside_count
  FROM public.class_schedules cs
  JOIN public.academic_years ay
    ON ay.id = cs.academic_year_id AND ay.institute_id = cs.institute_id
  WHERE cs.institute_id = v_profile.institute_id
    AND (v_profile.branch_id IS NULL OR cs.branch_id = v_profile.branch_id)
    AND (p_batch_id IS NULL OR cs.batch_id = p_batch_id)
    AND (p_class_schedule_id IS NULL OR cs.id = p_class_schedule_id)
    AND cs.is_active IS TRUE
    AND GREATEST(p_from_date, cs.effective_from, ay.start_date)
        > LEAST(p_to_date, COALESCE(cs.effective_to, p_to_date), ay.end_date);

  FOR v_occurrence IN
    SELECT
      cs.id AS class_schedule_id,
      cs.institute_id,
      cs.branch_id,
      cs.academic_year_id,
      cs.batch_id,
      cs.subject_id,
      gs::date AS event_date,
      cs.start_time,
      cs.end_time,
      cs.schedule_type,
      cs.room,
      upper(CASE
        WHEN s.subject_name IS NOT NULL THEN s.subject_name || ' - ' || b.name
        ELSE b.name
      END) AS title
    FROM public.class_schedules cs
    JOIN public.academic_years ay
      ON ay.id = cs.academic_year_id AND ay.institute_id = cs.institute_id
    JOIN public.batches b
      ON b.id = cs.batch_id AND b.institute_id = cs.institute_id
    LEFT JOIN public.subjects s
      ON s.id = cs.subject_id AND s.institute_id = cs.institute_id
    CROSS JOIN LATERAL generate_series(
      GREATEST(p_from_date, cs.effective_from, ay.start_date)::timestamp,
      LEAST(p_to_date, COALESCE(cs.effective_to, p_to_date), ay.end_date)::timestamp,
      interval '1 day'
    ) gs
    WHERE cs.institute_id = v_profile.institute_id
      AND cs.is_active IS TRUE
      AND (v_profile.branch_id IS NULL OR cs.branch_id = v_profile.branch_id)
      AND (p_batch_id IS NULL OR cs.batch_id = p_batch_id)
      AND (p_class_schedule_id IS NULL OR cs.id = p_class_schedule_id)
      AND GREATEST(p_from_date, cs.effective_from, ay.start_date)
          <= LEAST(p_to_date, COALESCE(cs.effective_to, p_to_date), ay.end_date)
      AND extract(isodow FROM gs)::smallint = cs.day_of_week
    ORDER BY gs, cs.start_time, cs.id
  LOOP
    v_candidate_count := v_candidate_count + 1;

    PERFORM pg_advisory_xact_lock(hashtextextended(
      v_occurrence.class_schedule_id::text || '|' || v_occurrence.event_date::text, 0
    ));

    IF EXISTS (
      SELECT 1 FROM public.schedule_events e
      WHERE e.class_schedule_id = v_occurrence.class_schedule_id
        AND e.event_date = v_occurrence.event_date
        AND e.original_event_id IS NULL
    ) THEN
      v_existing_count := v_existing_count + 1;
      CONTINUE;
    END IF;

    v_conflict_type := NULL;
    v_conflicting_event_id := NULL;

    SELECT 'holiday', e.id INTO v_conflict_type, v_conflicting_event_id
    FROM public.schedule_events e
    WHERE e.institute_id = v_occurrence.institute_id
      AND e.event_date = v_occurrence.event_date
      AND e.schedule_type = 'holiday'
      AND e.start_time IS NULL AND e.end_time IS NULL
      AND e.status NOT IN ('cancelled', 'rescheduled')
      AND (e.branch_id IS NULL OR e.branch_id = v_occurrence.branch_id)
    ORDER BY e.created_at
    LIMIT 1;

    IF v_conflict_type IS NULL THEN
      SELECT
        CASE
          WHEN e.batch_id = v_occurrence.batch_id THEN 'batch'
          ELSE 'room'
        END,
        e.id
      INTO v_conflict_type, v_conflicting_event_id
      FROM public.schedule_events e
      WHERE e.institute_id = v_occurrence.institute_id
        AND e.event_date = v_occurrence.event_date
        AND e.status NOT IN ('cancelled', 'rescheduled')
        AND e.start_time IS NOT NULL AND e.end_time IS NOT NULL
        AND e.start_time < v_occurrence.end_time
        AND e.end_time > v_occurrence.start_time
        AND (
          e.batch_id = v_occurrence.batch_id
          OR (
            v_occurrence.room IS NOT NULL
            AND e.room IS NOT NULL
            AND upper(btrim(e.room)) = upper(btrim(v_occurrence.room))
          )
        )
      ORDER BY CASE WHEN e.batch_id = v_occurrence.batch_id THEN 0 ELSE 1 END, e.created_at
      LIMIT 1;
    END IF;

    IF v_conflict_type IS NOT NULL THEN
      v_conflict_count := v_conflict_count + 1;
      v_conflicts := v_conflicts || jsonb_build_array(jsonb_build_object(
        'classScheduleId', v_occurrence.class_schedule_id,
        'date', v_occurrence.event_date,
        'startTime', to_char(v_occurrence.start_time, 'HH24:MI'),
        'endTime', to_char(v_occurrence.end_time, 'HH24:MI'),
        'batchId', v_occurrence.batch_id,
        'room', v_occurrence.room,
        'type', v_conflict_type,
        'conflictingEventId', v_conflicting_event_id
      ));
      CONTINUE;
    END IF;

    INSERT INTO public.schedule_events (
      institute_id, branch_id, academic_year_id, batch_id, class_schedule_id,
      subject_id, event_date, start_time, end_time, schedule_type, status,
      title, room, notification_required, created_by
    ) VALUES (
      v_occurrence.institute_id, v_occurrence.branch_id, v_occurrence.academic_year_id,
      v_occurrence.batch_id, v_occurrence.class_schedule_id, v_occurrence.subject_id,
      v_occurrence.event_date, v_occurrence.start_time, v_occurrence.end_time,
      v_occurrence.schedule_type, 'scheduled', v_occurrence.title,
      v_occurrence.room, false, v_profile.id
    )
    ON CONFLICT (class_schedule_id, event_date)
      WHERE class_schedule_id IS NOT NULL AND original_event_id IS NULL
    DO NOTHING
    RETURNING id INTO v_event_id;

    IF v_event_id IS NULL THEN
      v_existing_count := v_existing_count + 1;
    ELSE
      INSERT INTO public.schedule_changes (
        schedule_event_id, change_type, new_date, new_start_time, new_end_time, changed_by
      ) VALUES (
        v_event_id, 'created', v_occurrence.event_date,
        v_occurrence.start_time, v_occurrence.end_time, v_profile.id
      );
      v_generated_count := v_generated_count + 1;
      v_generated_ids := v_generated_ids || jsonb_build_array(v_event_id);
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'generatedCount', v_generated_count,
    'existingCount', v_existing_count,
    'conflictCount', v_conflict_count,
    'candidateCount', v_candidate_count,
    'skippedInactiveCount', v_inactive_count,
    'skippedOutsideRangeCount', v_outside_count,
    'generatedEventIds', v_generated_ids,
    'conflicts', v_conflicts
  );
END;
$$;

REVOKE ALL ON FUNCTION public.generate_schedule_events(date,date,uuid,uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.generate_schedule_events(date,date,uuid,uuid) TO authenticated;

COMMENT ON INDEX public.schedule_events_generated_occurrence_key IS
  'Prevents duplicate original recurring occurrences while allowing reschedule replacement rows.';
COMMENT ON FUNCTION public.generate_schedule_events(date,date,uuid,uuid) IS
  'Materializes active recurring schedules for a bounded range. Bulk generation suppresses routine notifications.';

COMMIT;
