DO $$
DECLARE
  v_definition text;
BEGIN
  SELECT pg_get_functiondef(
    'public.save_daily_attendance(date,uuid,uuid,jsonb)'::regprocedure
  ) INTO v_definition;

  IF position('FOR UPDATE' IN v_definition) > 0 THEN
    EXECUTE replace(v_definition, 'FOR UPDATE', 'FOR KEY SHARE');
  END IF;
END;
$$;
