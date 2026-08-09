BEGIN;

-- Restore the original Module 07 behavior.
CREATE OR REPLACE FUNCTION public.submit_practice_attempt(p_attempt_id uuid,p_answers jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_attempt public.practice_attempts%ROWTYPE; v_score numeric:=0; v_answer jsonb; v_question public.practice_set_questions%ROWTYPE; v_correct boolean; v_student uuid;
BEGIN
 SELECT * INTO v_attempt FROM public.practice_attempts WHERE id=p_attempt_id FOR UPDATE;
 IF v_attempt.id IS NULL OR v_attempt.status<>'in_progress' THEN RAISE EXCEPTION 'PRACTICE_ATTEMPT_INVALID'; END IF;
 v_student:=public.practice_work_student_id(v_attempt.institute_id);
 IF v_student IS NULL OR v_student<>v_attempt.student_id THEN RAISE EXCEPTION 'PRACTICE_UNAUTHORIZED'; END IF;
 FOR v_answer IN SELECT value FROM jsonb_array_elements(p_answers) LOOP
   SELECT q.* INTO v_question FROM public.practice_set_questions q JOIN public.practice_assignments a ON a.practice_set_id=q.practice_set_id WHERE q.id=(v_answer->>'questionId')::uuid AND a.id=v_attempt.practice_assignment_id;
   IF v_question.id IS NULL THEN RAISE EXCEPTION 'PRACTICE_QUESTION_INVALID'; END IF;
   v_correct:=lower(regexp_replace(btrim(v_answer->>'answer'),'[[:space:]]+',' ','g'))=ANY(SELECT lower(regexp_replace(btrim(x),'[[:space:]]+',' ','g')) FROM jsonb_array_elements_text(coalesce(v_question.accepted_answers,jsonb_build_array(v_question.correct_answer#>>'{}'))) x);
   INSERT INTO public.practice_attempt_answers(institute_id,practice_attempt_id,practice_set_question_id,student_answer,is_correct,marks_awarded) VALUES(v_attempt.institute_id,v_attempt.id,v_question.id,v_answer->'answer',v_correct,CASE WHEN v_correct THEN v_question.marks ELSE 0 END) ON CONFLICT(practice_attempt_id,practice_set_question_id) DO UPDATE SET student_answer=excluded.student_answer,is_correct=excluded.is_correct,marks_awarded=excluded.marks_awarded,answered_at=now();
   IF v_correct THEN v_score:=v_score+v_question.marks; END IF;
 END LOOP;
 UPDATE public.practice_attempts SET status='submitted',submitted_at=now(),score_obtained=v_score,percentage=CASE WHEN max_marks>0 THEN round(v_score/max_marks*100,2) ELSE 0 END WHERE id=v_attempt.id;
 UPDATE public.practice_assignments SET status='completed' WHERE id=v_attempt.practice_assignment_id;
 RETURN jsonb_build_object('scoreObtained',v_score,'maxMarks',v_attempt.max_marks,'percentage',CASE WHEN v_attempt.max_marks>0 THEN round(v_score/v_attempt.max_marks*100,2) ELSE 0 END,'review',(SELECT jsonb_agg(jsonb_build_object('questionId',q.id,'questionText',q.question_text,'studentAnswer',aa.student_answer,'correctAnswer',q.correct_answer,'explanation',q.answer_explanation,'isCorrect',aa.is_correct,'marksAwarded',aa.marks_awarded,'maxMarks',q.marks) ORDER BY q.display_order) FROM public.practice_set_questions q LEFT JOIN public.practice_attempt_answers aa ON aa.practice_set_question_id=q.id AND aa.practice_attempt_id=v_attempt.id JOIN public.practice_assignments a ON a.practice_set_id=q.practice_set_id WHERE a.id=v_attempt.practice_assignment_id));
END; $$;
REVOKE ALL ON FUNCTION public.submit_practice_attempt(uuid,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.submit_practice_attempt(uuid,jsonb) TO authenticated;
COMMENT ON FUNCTION public.submit_practice_attempt(uuid,jsonb) IS 'Scores deterministically and reveals answers only after submission.';
COMMIT;
