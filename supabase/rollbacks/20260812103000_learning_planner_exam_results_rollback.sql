BEGIN;
DO $$ BEGIN IF EXISTS (SELECT 1 FROM public.exam_result_sets WHERE status IN ('published','superseded')) THEN RAISE EXCEPTION 'Rollback blocked: published exam-result history exists.'; END IF; END $$;
DROP FUNCTION IF EXISTS public.publish_exam_result(uuid);
DROP FUNCTION IF EXISTS public.save_exam_result_draft(uuid,numeric,jsonb,text);
DROP TABLE IF EXISTS public.exam_student_results;
DROP TABLE IF EXISTS public.exam_result_sets;
COMMIT;
