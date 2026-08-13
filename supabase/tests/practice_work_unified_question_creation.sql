BEGIN;
DO $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='practice_question_source_files' AND rowsecurity) THEN RAISE EXCEPTION 'Source files RLS missing'; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='practice_question_assets' AND rowsecurity) THEN RAISE EXCEPTION 'Assets RLS missing'; END IF;
 IF (SELECT public FROM storage.buckets WHERE id='practice-work-private') IS DISTINCT FROM false THEN RAISE EXCEPTION 'Private bucket missing'; END IF;
 IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='question_bank' AND column_name='source_full_marks') THEN RAISE EXCEPTION 'Question metadata missing'; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='question_bank_source_filters_idx') THEN RAISE EXCEPTION 'Filter index missing'; END IF;
 IF has_function_privilege('anon','public.seed_practice_question_templates()','EXECUTE') THEN RAISE EXCEPTION 'Anonymous template seeding allowed'; END IF;
END $$;
ROLLBACK;
