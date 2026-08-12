BEGIN;
DO $$ BEGIN IF EXISTS(SELECT 1 FROM public.exam_result_sets WHERE status IN('published','superseded')) THEN RAISE EXCEPTION 'Rollback blocked: published exam-result history exists.'; END IF; END $$;
ALTER TABLE public.exam_student_results DROP CONSTRAINT exam_student_results_parent_call_check,DROP CONSTRAINT exam_student_results_follow_up_check,DROP CONSTRAINT exam_student_results_comment_check,DROP CONSTRAINT exam_student_results_indicator_check,DROP COLUMN follow_up_status,DROP COLUMN result_comment,DROP COLUMN result_indicator;
COMMIT;
