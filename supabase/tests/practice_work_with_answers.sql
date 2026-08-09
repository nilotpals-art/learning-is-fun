-- Transactional verification for Module 07. Safe to run against a populated project.
BEGIN;

DO $$
DECLARE
  required_table text;
  required_function text;
BEGIN
  FOREACH required_table IN ARRAY ARRAY[
    'question_templates', 'ai_question_generations', 'ai_generated_questions',
    'question_bank', 'practice_sets', 'practice_set_questions',
    'practice_assignments', 'practice_attempts', 'practice_attempt_answers'
  ] LOOP
    IF to_regclass('public.' || required_table) IS NULL THEN
      RAISE EXCEPTION 'Missing Practice Work table: %', required_table;
    END IF;
  END LOOP;

  FOREACH required_function IN ARRAY ARRAY[
    'publish_practice_set', 'assign_practice_set', 'start_practice_attempt',
    'submit_practice_attempt', 'create_practice_retry',
    'practice_work_parent_can_view_student'
  ] LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public' AND p.proname = required_function
    ) THEN
      RAISE EXCEPTION 'Missing Practice Work RPC: %', required_function;
    END IF;
  END LOOP;

  IF EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = ANY(ARRAY['question_templates','ai_question_generations','ai_generated_questions','question_bank','practice_sets','practice_set_questions','practice_assignments','practice_attempts','practice_attempt_answers'])
      AND NOT c.relrowsecurity
  ) THEN
    RAISE EXCEPTION 'RLS is not enabled on every Practice Work table';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'practice_set_questions'
      AND policyname ILIKE '%student%'
  ) THEN
    RAISE EXCEPTION 'Students must not receive direct access to answer-bearing snapshots';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='question_bank_filters_idx')
     OR NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='practice_assignments_student_idx')
     OR NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='practice_attempts_student_idx') THEN
    RAISE EXCEPTION 'Required Practice Work indexes are missing';
  END IF;
END $$;

ROLLBACK;
