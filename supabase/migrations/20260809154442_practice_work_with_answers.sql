BEGIN;

CREATE TABLE public.question_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), institute_id uuid NOT NULL REFERENCES public.institutes(id) ON DELETE RESTRICT,
  name text NOT NULL, question_type text NOT NULL, instructions text NOT NULL, prompt_rules text NOT NULL,
  supports_options boolean NOT NULL DEFAULT false, requires_explanation boolean NOT NULL DEFAULT true,
  is_active boolean NOT NULL DEFAULT true, created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT question_templates_creator_fkey FOREIGN KEY(created_by,institute_id) REFERENCES public.profiles(id,institute_id) ON DELETE RESTRICT,
  CONSTRAINT question_templates_name_check CHECK (btrim(name)<>'' AND char_length(name)<=100),
  CONSTRAINT question_templates_type_check CHECK (question_type IN ('mcq','fill_blank','true_false','sentence_correction','rearrange_words','short_answer','reading_comprehension')),
  CONSTRAINT question_templates_institute_name_key UNIQUE(institute_id,name),
  CONSTRAINT question_templates_id_institute_key UNIQUE(id,institute_id)
);

CREATE TABLE public.ai_question_generations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), institute_id uuid NOT NULL REFERENCES public.institutes(id) ON DELETE RESTRICT,
  board_id uuid NULL, class_id uuid NULL, book_name text NULL, chapter text NULL, skill text NULL, topic text NULL, subtopic text NULL,
  template_id uuid NOT NULL, question_count_requested integer NOT NULL, difficulty text NOT NULL, custom_instruction text NULL,
  include_answers boolean NOT NULL DEFAULT true, include_explanations boolean NOT NULL DEFAULT true,
  avoid_duplicates boolean NOT NULL DEFAULT true, keep_language_simple boolean NOT NULL DEFAULT true,
  model text NOT NULL, status text NOT NULL DEFAULT 'pending', generated_count integer NOT NULL DEFAULT 0,
  approved_count integer NOT NULL DEFAULT 0, rejected_count integer NOT NULL DEFAULT 0,
  safe_error_code text NULL, created_by uuid NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ai_generations_board_fkey FOREIGN KEY(board_id,institute_id) REFERENCES public.boards(id,institute_id) ON DELETE RESTRICT,
  CONSTRAINT ai_generations_class_fkey FOREIGN KEY(class_id,institute_id) REFERENCES public.academic_classes(id,institute_id) ON DELETE RESTRICT,
  CONSTRAINT ai_generations_template_fkey FOREIGN KEY(template_id,institute_id) REFERENCES public.question_templates(id,institute_id) ON DELETE RESTRICT,
  CONSTRAINT ai_generations_creator_fkey FOREIGN KEY(created_by,institute_id) REFERENCES public.profiles(id,institute_id) ON DELETE RESTRICT,
  CONSTRAINT ai_generations_count_check CHECK(question_count_requested BETWEEN 1 AND 30),
  CONSTRAINT ai_generations_difficulty_check CHECK(difficulty IN ('beginner','intermediate','advanced')),
  CONSTRAINT ai_generations_status_check CHECK(status IN ('pending','completed','failed','reviewed')),
  CONSTRAINT ai_generations_id_institute_key UNIQUE(id,institute_id)
);

CREATE TABLE public.ai_generated_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), institute_id uuid NOT NULL REFERENCES public.institutes(id) ON DELETE RESTRICT,
  ai_generation_id uuid NOT NULL, question_type text NOT NULL, question_text text NOT NULL, options jsonb NULL,
  correct_answer jsonb NOT NULL, accepted_answers jsonb NULL, answer_explanation text NULL,
  difficulty text NOT NULL, suggested_marks numeric(8,2) NOT NULL DEFAULT 1, tags jsonb NOT NULL DEFAULT '[]'::jsonb,
  review_status text NOT NULL DEFAULT 'pending', duplicate_warning boolean NOT NULL DEFAULT false,
  edited_question jsonb NULL, created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ai_generated_generation_fkey FOREIGN KEY(ai_generation_id,institute_id) REFERENCES public.ai_question_generations(id,institute_id) ON DELETE CASCADE,
  CONSTRAINT ai_generated_type_check CHECK(question_type IN ('mcq','fill_blank','true_false','sentence_correction','rearrange_words','short_answer','reading_comprehension')),
  CONSTRAINT ai_generated_difficulty_check CHECK(difficulty IN ('beginner','intermediate','advanced')),
  CONSTRAINT ai_generated_marks_check CHECK(suggested_marks>0),
  CONSTRAINT ai_generated_review_check CHECK(review_status IN ('pending','approved','rejected')),
  CONSTRAINT ai_generated_id_institute_key UNIQUE(id,institute_id)
);

CREATE TABLE public.question_bank (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), institute_id uuid NOT NULL REFERENCES public.institutes(id) ON DELETE RESTRICT,
  board_id uuid NULL, class_id uuid NULL, book_name text NULL, chapter text NULL, skill text NULL, topic text NULL, subtopic text NULL,
  template_id uuid NULL, question_type text NOT NULL, question_text text NOT NULL, normalized_question_text text NOT NULL,
  options jsonb NULL, correct_answer jsonb NOT NULL, accepted_answers jsonb NULL, answer_explanation text NULL,
  difficulty text NOT NULL, suggested_marks numeric(8,2) NULL, source_type text NOT NULL, ai_generation_id uuid NULL,
  is_active boolean NOT NULL DEFAULT true, created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT question_bank_board_fkey FOREIGN KEY(board_id,institute_id) REFERENCES public.boards(id,institute_id) ON DELETE RESTRICT,
  CONSTRAINT question_bank_class_fkey FOREIGN KEY(class_id,institute_id) REFERENCES public.academic_classes(id,institute_id) ON DELETE RESTRICT,
  CONSTRAINT question_bank_template_fkey FOREIGN KEY(template_id,institute_id) REFERENCES public.question_templates(id,institute_id) ON DELETE RESTRICT,
  CONSTRAINT question_bank_generation_fkey FOREIGN KEY(ai_generation_id,institute_id) REFERENCES public.ai_question_generations(id,institute_id) ON DELETE RESTRICT,
  CONSTRAINT question_bank_creator_fkey FOREIGN KEY(created_by,institute_id) REFERENCES public.profiles(id,institute_id) ON DELETE RESTRICT,
  CONSTRAINT question_bank_type_check CHECK(question_type IN ('mcq','fill_blank','true_false','sentence_correction','rearrange_words','short_answer','reading_comprehension')),
  CONSTRAINT question_bank_difficulty_check CHECK(difficulty IN ('beginner','intermediate','advanced')),
  CONSTRAINT question_bank_source_check CHECK(source_type IN ('manual','ai')),
  CONSTRAINT question_bank_marks_check CHECK(suggested_marks IS NULL OR suggested_marks>0),
  CONSTRAINT question_bank_normalized_key UNIQUE(institute_id,normalized_question_text),
  CONSTRAINT question_bank_id_institute_key UNIQUE(id,institute_id)
);

CREATE TABLE public.practice_sets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), institute_id uuid NOT NULL REFERENCES public.institutes(id) ON DELETE RESTRICT,
  academic_year_id uuid NOT NULL, board_id uuid NULL, class_id uuid NULL, book_name text NULL, chapter text NULL,
  skill text NULL, topic text NULL, subtopic text NULL, schedule_event_id uuid NULL,
  title text NOT NULL, description text NULL, instructions text NULL, difficulty text NULL,
  answer_mode text NOT NULL DEFAULT 'after_completion', allow_retry boolean NOT NULL DEFAULT true, max_attempts integer NULL,
  marks_mode text NOT NULL, default_marks numeric(8,2) NULL, target_total_marks numeric(10,2) NULL,
  status text NOT NULL DEFAULT 'draft', created_by uuid NOT NULL, published_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT practice_sets_year_fkey FOREIGN KEY(academic_year_id,institute_id) REFERENCES public.academic_years(id,institute_id) ON DELETE RESTRICT,
  CONSTRAINT practice_sets_board_fkey FOREIGN KEY(board_id,institute_id) REFERENCES public.boards(id,institute_id) ON DELETE RESTRICT,
  CONSTRAINT practice_sets_class_fkey FOREIGN KEY(class_id,institute_id) REFERENCES public.academic_classes(id,institute_id) ON DELETE RESTRICT,
  CONSTRAINT practice_sets_event_fkey FOREIGN KEY(schedule_event_id,institute_id) REFERENCES public.schedule_events(id,institute_id) ON DELETE RESTRICT,
  CONSTRAINT practice_sets_creator_fkey FOREIGN KEY(created_by,institute_id) REFERENCES public.profiles(id,institute_id) ON DELETE RESTRICT,
  CONSTRAINT practice_sets_status_check CHECK(status IN ('draft','published','closed','archived')),
  CONSTRAINT practice_sets_answer_mode_check CHECK(answer_mode IN ('after_each_question','after_completion')),
  CONSTRAINT practice_sets_marks_mode_check CHECK(marks_mode IN ('same_for_all','custom','ai_suggested')),
  CONSTRAINT practice_sets_attempts_check CHECK(max_attempts IS NULL OR max_attempts>=1),
  CONSTRAINT practice_sets_marks_check CHECK((default_marks IS NULL OR default_marks>0) AND (target_total_marks IS NULL OR target_total_marks>0)),
  CONSTRAINT practice_sets_id_institute_key UNIQUE(id,institute_id)
);

CREATE TABLE public.practice_set_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), institute_id uuid NOT NULL REFERENCES public.institutes(id) ON DELETE RESTRICT,
  practice_set_id uuid NOT NULL, question_bank_id uuid NULL, question_type text NOT NULL, question_text text NOT NULL,
  options jsonb NULL, correct_answer jsonb NOT NULL, accepted_answers jsonb NULL, answer_explanation text NULL,
  difficulty text NOT NULL, marks numeric(8,2) NOT NULL, display_order integer NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT set_questions_set_fkey FOREIGN KEY(practice_set_id,institute_id) REFERENCES public.practice_sets(id,institute_id) ON DELETE CASCADE,
  CONSTRAINT set_questions_bank_fkey FOREIGN KEY(question_bank_id,institute_id) REFERENCES public.question_bank(id,institute_id) ON DELETE SET NULL,
  CONSTRAINT set_questions_marks_check CHECK(marks>0), CONSTRAINT set_questions_order_check CHECK(display_order>=1),
  CONSTRAINT set_questions_order_key UNIQUE(practice_set_id,display_order),
  CONSTRAINT set_questions_bank_key UNIQUE(practice_set_id,question_bank_id),
  CONSTRAINT set_questions_id_institute_key UNIQUE(id,institute_id)
);

CREATE TABLE public.practice_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), institute_id uuid NOT NULL REFERENCES public.institutes(id) ON DELETE RESTRICT,
  assignment_group_id uuid NOT NULL DEFAULT gen_random_uuid(), practice_set_id uuid NOT NULL, batch_id uuid NULL, student_id uuid NOT NULL,
  schedule_event_id uuid NULL, assigned_at timestamptz NOT NULL DEFAULT now(), available_from timestamptz NULL, due_at timestamptz NULL,
  status text NOT NULL DEFAULT 'assigned', created_by uuid NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT practice_assignments_set_fkey FOREIGN KEY(practice_set_id,institute_id) REFERENCES public.practice_sets(id,institute_id) ON DELETE RESTRICT,
  CONSTRAINT practice_assignments_batch_fkey FOREIGN KEY(batch_id,institute_id) REFERENCES public.batches(id,institute_id) ON DELETE RESTRICT,
  CONSTRAINT practice_assignments_student_fkey FOREIGN KEY(student_id,institute_id) REFERENCES public.students(id,institute_id) ON DELETE RESTRICT,
  CONSTRAINT practice_assignments_event_fkey FOREIGN KEY(schedule_event_id,institute_id) REFERENCES public.schedule_events(id,institute_id) ON DELETE RESTRICT,
  CONSTRAINT practice_assignments_creator_fkey FOREIGN KEY(created_by,institute_id) REFERENCES public.profiles(id,institute_id) ON DELETE RESTRICT,
  CONSTRAINT practice_assignments_status_check CHECK(status IN ('assigned','in_progress','completed','closed')),
  CONSTRAINT practice_assignments_due_check CHECK(due_at IS NULL OR available_from IS NULL OR due_at>=available_from),
  CONSTRAINT practice_assignments_student_set_key UNIQUE(practice_set_id,student_id),
  CONSTRAINT practice_assignments_id_institute_key UNIQUE(id,institute_id)
);

CREATE TABLE public.practice_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), institute_id uuid NOT NULL REFERENCES public.institutes(id) ON DELETE RESTRICT,
  practice_assignment_id uuid NOT NULL, student_id uuid NOT NULL, attempt_no integer NOT NULL,
  started_at timestamptz NOT NULL DEFAULT now(), submitted_at timestamptz NULL, status text NOT NULL DEFAULT 'in_progress',
  score_obtained numeric(10,2) NULL, max_marks numeric(10,2) NOT NULL, percentage numeric(6,2) NULL,
  is_retry boolean NOT NULL DEFAULT false, parent_attempt_id uuid NULL, created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT practice_attempts_assignment_fkey FOREIGN KEY(practice_assignment_id,institute_id) REFERENCES public.practice_assignments(id,institute_id) ON DELETE RESTRICT,
  CONSTRAINT practice_attempts_student_fkey FOREIGN KEY(student_id,institute_id) REFERENCES public.students(id,institute_id) ON DELETE RESTRICT,
  CONSTRAINT practice_attempts_parent_fkey FOREIGN KEY(parent_attempt_id,institute_id) REFERENCES public.practice_attempts(id,institute_id) ON DELETE RESTRICT,
  CONSTRAINT practice_attempts_status_check CHECK(status IN ('in_progress','submitted','reviewed')),
  CONSTRAINT practice_attempts_number_check CHECK(attempt_no>=1),
  CONSTRAINT practice_attempts_number_key UNIQUE(practice_assignment_id,attempt_no),
  CONSTRAINT practice_attempts_id_institute_key UNIQUE(id,institute_id)
);

CREATE TABLE public.practice_attempt_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), institute_id uuid NOT NULL REFERENCES public.institutes(id) ON DELETE RESTRICT,
  practice_attempt_id uuid NOT NULL, practice_set_question_id uuid NOT NULL, student_answer jsonb NOT NULL,
  is_correct boolean NULL, marks_awarded numeric(8,2) NULL, answered_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT attempt_answers_attempt_fkey FOREIGN KEY(practice_attempt_id,institute_id) REFERENCES public.practice_attempts(id,institute_id) ON DELETE CASCADE,
  CONSTRAINT attempt_answers_question_fkey FOREIGN KEY(practice_set_question_id,institute_id) REFERENCES public.practice_set_questions(id,institute_id) ON DELETE RESTRICT,
  CONSTRAINT attempt_answers_marks_check CHECK(marks_awarded IS NULL OR marks_awarded>=0),
  CONSTRAINT attempt_answers_question_key UNIQUE(practice_attempt_id,practice_set_question_id)
);

CREATE INDEX question_bank_filters_idx ON public.question_bank(institute_id,is_active,difficulty,question_type);
CREATE INDEX practice_sets_institute_status_idx ON public.practice_sets(institute_id,status);
CREATE INDEX practice_assignments_student_idx ON public.practice_assignments(student_id,status,due_at);
CREATE INDEX practice_assignments_group_idx ON public.practice_assignments(assignment_group_id);
CREATE INDEX practice_attempts_student_idx ON public.practice_attempts(student_id,created_at DESC);
CREATE INDEX practice_attempt_answers_attempt_idx ON public.practice_attempt_answers(practice_attempt_id);

CREATE TRIGGER question_templates_updated_at BEFORE UPDATE ON public.question_templates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER question_bank_updated_at BEFORE UPDATE ON public.question_bank FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER practice_sets_updated_at BEFORE UPDATE ON public.practice_sets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.question_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_question_generations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_generated_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.question_bank ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.practice_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.practice_set_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.practice_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.practice_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.practice_attempt_answers ENABLE ROW LEVEL SECURITY;

CREATE FUNCTION public.practice_work_admin_scope(p_institute_id uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY INVOKER SET search_path='' AS $$
 SELECT EXISTS(SELECT 1 FROM public.profiles p WHERE p.id=(SELECT auth.uid()) AND p.is_active IS TRUE AND p.institute_id=p_institute_id AND p.role IN ('admin','Super Admin','Institute Admin'));
$$;
CREATE FUNCTION public.practice_work_student_id(p_institute_id uuid) RETURNS uuid LANGUAGE sql STABLE SECURITY INVOKER SET search_path='' AS $$
 SELECT s.id FROM public.students s JOIN public.profiles p ON p.id=s.profile_id WHERE p.id=(SELECT auth.uid()) AND p.is_active IS TRUE AND p.role='Student' AND s.institute_id=p_institute_id LIMIT 1;
$$;

CREATE POLICY templates_admin_all ON public.question_templates FOR ALL TO authenticated USING(public.practice_work_admin_scope(institute_id)) WITH CHECK(public.practice_work_admin_scope(institute_id));
CREATE POLICY generations_admin_all ON public.ai_question_generations FOR ALL TO authenticated USING(public.practice_work_admin_scope(institute_id)) WITH CHECK(public.practice_work_admin_scope(institute_id));
CREATE POLICY generated_admin_all ON public.ai_generated_questions FOR ALL TO authenticated USING(public.practice_work_admin_scope(institute_id)) WITH CHECK(public.practice_work_admin_scope(institute_id));
CREATE POLICY question_bank_admin_all ON public.question_bank FOR ALL TO authenticated USING(public.practice_work_admin_scope(institute_id)) WITH CHECK(public.practice_work_admin_scope(institute_id));
CREATE POLICY practice_sets_admin_all ON public.practice_sets FOR ALL TO authenticated USING(public.practice_work_admin_scope(institute_id)) WITH CHECK(public.practice_work_admin_scope(institute_id));
CREATE POLICY set_questions_admin_all ON public.practice_set_questions FOR ALL TO authenticated USING(public.practice_work_admin_scope(institute_id)) WITH CHECK(public.practice_work_admin_scope(institute_id));
CREATE POLICY assignments_admin_all ON public.practice_assignments FOR ALL TO authenticated USING(public.practice_work_admin_scope(institute_id)) WITH CHECK(public.practice_work_admin_scope(institute_id));
CREATE POLICY assignments_student_select ON public.practice_assignments FOR SELECT TO authenticated USING(student_id=public.practice_work_student_id(institute_id));
CREATE POLICY assignments_parent_select ON public.practice_assignments FOR SELECT TO authenticated USING(EXISTS(SELECT 1 FROM public.parents pa JOIN public.profiles p ON p.id=pa.profile_id JOIN public.student_parent_links spl ON spl.parent_id=pa.id AND spl.institute_id=pa.institute_id WHERE p.id=(SELECT auth.uid()) AND p.is_active IS TRUE AND pa.is_active IS TRUE AND spl.student_id=practice_assignments.student_id AND pa.institute_id=practice_assignments.institute_id));
CREATE POLICY attempts_admin_all ON public.practice_attempts FOR ALL TO authenticated USING(public.practice_work_admin_scope(institute_id)) WITH CHECK(public.practice_work_admin_scope(institute_id));
CREATE POLICY attempts_student_select ON public.practice_attempts FOR SELECT TO authenticated USING(student_id=public.practice_work_student_id(institute_id));
CREATE POLICY attempts_parent_select ON public.practice_attempts FOR SELECT TO authenticated USING(EXISTS(SELECT 1 FROM public.parents pa JOIN public.profiles p ON p.id=pa.profile_id JOIN public.student_parent_links spl ON spl.parent_id=pa.id AND spl.institute_id=pa.institute_id WHERE p.id=(SELECT auth.uid()) AND p.is_active IS TRUE AND spl.student_id=practice_attempts.student_id AND pa.institute_id=practice_attempts.institute_id));
CREATE POLICY answers_admin_select ON public.practice_attempt_answers FOR SELECT TO authenticated USING(public.practice_work_admin_scope(institute_id));
CREATE POLICY answers_student_select ON public.practice_attempt_answers FOR SELECT TO authenticated USING(EXISTS(SELECT 1 FROM public.practice_attempts a WHERE a.id=practice_attempt_id AND a.student_id=public.practice_work_student_id(a.institute_id)));

CREATE FUNCTION public.publish_practice_set(p_practice_set_id uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE v_set public.practice_sets%ROWTYPE; v_count int; v_total numeric;
BEGIN
 SELECT * INTO v_set FROM public.practice_sets WHERE id=p_practice_set_id FOR UPDATE;
 IF v_set.id IS NULL OR NOT public.practice_work_admin_scope(v_set.institute_id) THEN RAISE EXCEPTION 'PRACTICE_SET_NOT_FOUND'; END IF;
 IF v_set.status<>'draft' THEN RAISE EXCEPTION 'PRACTICE_SET_NOT_DRAFT'; END IF;
 SELECT count(*),coalesce(sum(marks),0) INTO v_count,v_total FROM public.practice_set_questions WHERE practice_set_id=v_set.id;
 IF v_count=0 OR v_total<=0 THEN RAISE EXCEPTION 'PRACTICE_SET_EMPTY'; END IF;
 IF v_set.target_total_marks IS NOT NULL AND v_set.target_total_marks<>v_total THEN RAISE EXCEPTION 'PRACTICE_TARGET_MARKS_MISMATCH'; END IF;
 UPDATE public.practice_sets SET status='published',published_at=now() WHERE id=v_set.id;
 RETURN jsonb_build_object('questionCount',v_count,'totalMarks',v_total);
END; $$;

CREATE FUNCTION public.assign_practice_set(p_practice_set_id uuid,p_batch_id uuid DEFAULT NULL,p_student_ids uuid[] DEFAULT NULL,p_available_from timestamptz DEFAULT NULL,p_due_at timestamptz DEFAULT NULL,p_schedule_event_id uuid DEFAULT NULL) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE v_set public.practice_sets%ROWTYPE; v_profile public.profiles%ROWTYPE; v_group uuid:=gen_random_uuid(); v_count int;
BEGIN
 SELECT * INTO v_profile FROM public.profiles WHERE id=(SELECT auth.uid()) AND is_active IS TRUE;
 SELECT * INTO v_set FROM public.practice_sets WHERE id=p_practice_set_id AND institute_id=v_profile.institute_id AND status='published';
 IF v_set.id IS NULL OR NOT public.practice_work_admin_scope(v_profile.institute_id) THEN RAISE EXCEPTION 'PRACTICE_SET_NOT_FOUND'; END IF;
 IF p_due_at IS NOT NULL AND p_available_from IS NOT NULL AND p_due_at<p_available_from THEN RAISE EXCEPTION 'PRACTICE_DUE_INVALID'; END IF;
 IF p_schedule_event_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.schedule_events e WHERE e.id=p_schedule_event_id AND e.institute_id=v_profile.institute_id) THEN RAISE EXCEPTION 'PRACTICE_EVENT_INVALID'; END IF;
 IF p_batch_id IS NOT NULL THEN
   IF NOT EXISTS(SELECT 1 FROM public.batches b WHERE b.id=p_batch_id AND b.institute_id=v_profile.institute_id) THEN RAISE EXCEPTION 'PRACTICE_BATCH_INVALID'; END IF;
   INSERT INTO public.practice_assignments(institute_id,assignment_group_id,practice_set_id,batch_id,student_id,schedule_event_id,available_from,due_at,created_by)
   SELECT v_profile.institute_id,v_group,v_set.id,p_batch_id,sa.student_id,p_schedule_event_id,p_available_from,p_due_at,v_profile.id
   FROM public.student_assignments sa WHERE sa.institute_id=v_profile.institute_id AND sa.batch_id=p_batch_id AND sa.effective_from<=current_date AND (sa.effective_to IS NULL OR sa.effective_to>=current_date)
   ON CONFLICT(practice_set_id,student_id) DO NOTHING;
 ELSE
   INSERT INTO public.practice_assignments(institute_id,assignment_group_id,practice_set_id,student_id,schedule_event_id,available_from,due_at,created_by)
   SELECT v_profile.institute_id,v_group,v_set.id,s.id,p_schedule_event_id,p_available_from,p_due_at,v_profile.id FROM public.students s WHERE s.institute_id=v_profile.institute_id AND s.id=ANY(coalesce(p_student_ids,'{}'::uuid[]))
   ON CONFLICT(practice_set_id,student_id) DO NOTHING;
 END IF;
 GET DIAGNOSTICS v_count=ROW_COUNT; RETURN jsonb_build_object('assignmentGroupId',v_group,'assignedCount',v_count);
END; $$;

CREATE FUNCTION public.start_practice_attempt(p_assignment_id uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_assignment public.practice_assignments%ROWTYPE; v_set public.practice_sets%ROWTYPE; v_student uuid; v_attempt public.practice_attempts%ROWTYPE; v_next int; v_max numeric;
BEGIN
 SELECT * INTO v_assignment FROM public.practice_assignments WHERE id=p_assignment_id FOR UPDATE;
 IF v_assignment.id IS NULL THEN RAISE EXCEPTION 'PRACTICE_ASSIGNMENT_NOT_FOUND'; END IF;
 v_student:=public.practice_work_student_id(v_assignment.institute_id);
 IF v_student IS NULL OR v_student<>v_assignment.student_id THEN RAISE EXCEPTION 'PRACTICE_UNAUTHORIZED'; END IF;
 IF v_assignment.available_from IS NOT NULL AND v_assignment.available_from>now() THEN RAISE EXCEPTION 'PRACTICE_NOT_AVAILABLE'; END IF;
 SELECT * INTO v_set FROM public.practice_sets WHERE id=v_assignment.practice_set_id;
 SELECT * INTO v_attempt FROM public.practice_attempts WHERE practice_assignment_id=v_assignment.id AND status='in_progress' ORDER BY attempt_no DESC LIMIT 1;
 IF v_attempt.id IS NULL THEN
   SELECT coalesce(max(attempt_no),0)+1 INTO v_next FROM public.practice_attempts WHERE practice_assignment_id=v_assignment.id;
   IF v_set.max_attempts IS NOT NULL AND v_next>v_set.max_attempts THEN RAISE EXCEPTION 'PRACTICE_MAX_ATTEMPTS'; END IF;
   SELECT coalesce(sum(marks),0) INTO v_max FROM public.practice_set_questions WHERE practice_set_id=v_set.id;
   INSERT INTO public.practice_attempts(institute_id,practice_assignment_id,student_id,attempt_no,max_marks,is_retry) VALUES(v_assignment.institute_id,v_assignment.id,v_student,v_next,v_max,v_next>1) RETURNING * INTO v_attempt;
   UPDATE public.practice_assignments SET status='in_progress' WHERE id=v_assignment.id;
 END IF;
 RETURN jsonb_build_object('attemptId',v_attempt.id,'attemptNo',v_attempt.attempt_no,'title',v_set.title,'answerMode',v_set.answer_mode,'questions',(SELECT jsonb_agg(jsonb_build_object('id',q.id,'questionType',q.question_type,'questionText',q.question_text,'options',q.options,'marks',q.marks,'displayOrder',q.display_order) ORDER BY q.display_order) FROM public.practice_set_questions q WHERE q.practice_set_id=v_set.id));
END; $$;

CREATE FUNCTION public.submit_practice_attempt(p_attempt_id uuid,p_answers jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_attempt public.practice_attempts%ROWTYPE; v_assignment public.practice_assignments%ROWTYPE; v_score numeric:=0; v_answer jsonb; v_question public.practice_set_questions%ROWTYPE; v_correct boolean; v_student uuid;
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

CREATE FUNCTION public.create_practice_retry(p_parent_attempt_id uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_parent public.practice_attempts%ROWTYPE; v_assignment public.practice_assignments%ROWTYPE; v_set public.practice_sets%ROWTYPE; v_attempt public.practice_attempts%ROWTYPE; v_next int; v_max numeric;
BEGIN
 SELECT * INTO v_parent FROM public.practice_attempts WHERE id=p_parent_attempt_id AND status IN('submitted','reviewed') FOR UPDATE;
 IF v_parent.id IS NULL OR public.practice_work_student_id(v_parent.institute_id)<>v_parent.student_id THEN RAISE EXCEPTION 'PRACTICE_ATTEMPT_INVALID'; END IF;
 SELECT * INTO v_assignment FROM public.practice_assignments WHERE id=v_parent.practice_assignment_id; SELECT * INTO v_set FROM public.practice_sets WHERE id=v_assignment.practice_set_id;
 IF NOT v_set.allow_retry THEN RAISE EXCEPTION 'PRACTICE_RETRY_DISABLED'; END IF;
 SELECT coalesce(max(attempt_no),0)+1 INTO v_next FROM public.practice_attempts WHERE practice_assignment_id=v_assignment.id;
 IF v_set.max_attempts IS NOT NULL AND v_next>v_set.max_attempts THEN RAISE EXCEPTION 'PRACTICE_MAX_ATTEMPTS'; END IF;
 SELECT coalesce(sum(q.marks),0) INTO v_max FROM public.practice_attempt_answers aa JOIN public.practice_set_questions q ON q.id=aa.practice_set_question_id WHERE aa.practice_attempt_id=v_parent.id AND aa.is_correct IS FALSE;
 IF v_max<=0 THEN RAISE EXCEPTION 'PRACTICE_NO_INCORRECT'; END IF;
 INSERT INTO public.practice_attempts(institute_id,practice_assignment_id,student_id,attempt_no,max_marks,is_retry,parent_attempt_id) VALUES(v_parent.institute_id,v_assignment.id,v_parent.student_id,v_next,v_max,true,v_parent.id) RETURNING * INTO v_attempt;
 RETURN jsonb_build_object('attemptId',v_attempt.id,'attemptNo',v_next,'questions',(SELECT jsonb_agg(jsonb_build_object('id',q.id,'questionType',q.question_type,'questionText',q.question_text,'options',q.options,'marks',q.marks,'displayOrder',q.display_order) ORDER BY q.display_order) FROM public.practice_attempt_answers aa JOIN public.practice_set_questions q ON q.id=aa.practice_set_question_id WHERE aa.practice_attempt_id=v_parent.id AND aa.is_correct IS FALSE));
END; $$;

REVOKE ALL ON FUNCTION public.practice_work_admin_scope(uuid),public.practice_work_student_id(uuid),public.publish_practice_set(uuid),public.assign_practice_set(uuid,uuid,uuid[],timestamptz,timestamptz,uuid),public.start_practice_attempt(uuid),public.submit_practice_attempt(uuid,jsonb),public.create_practice_retry(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.practice_work_admin_scope(uuid),public.practice_work_student_id(uuid),public.publish_practice_set(uuid),public.assign_practice_set(uuid,uuid,uuid[],timestamptz,timestamptz,uuid),public.start_practice_attempt(uuid),public.submit_practice_attempt(uuid,jsonb),public.create_practice_retry(uuid) TO authenticated;
GRANT SELECT,INSERT,UPDATE ON public.question_templates,public.ai_question_generations,public.ai_generated_questions,public.question_bank,public.practice_sets,public.practice_set_questions,public.practice_assignments,public.practice_attempts,public.practice_attempt_answers TO authenticated;

COMMENT ON TABLE public.practice_set_questions IS 'Immutable question and answer snapshots after Practice Set publication. Students have no direct SELECT policy.';
COMMENT ON FUNCTION public.submit_practice_attempt(uuid,jsonb) IS 'Scores deterministically and reveals answers only after submission.';

COMMIT;
