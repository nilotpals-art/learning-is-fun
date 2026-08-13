BEGIN;

CREATE TABLE public.practice_question_source_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institute_id uuid NOT NULL REFERENCES public.institutes(id) ON DELETE RESTRICT,
  storage_bucket text NOT NULL DEFAULT 'practice-work-private',
  storage_path text NOT NULL,
  original_filename text NOT NULL,
  mime_type text NOT NULL,
  byte_size bigint NOT NULL CHECK (byte_size > 0 AND byte_size <= 15728640),
  sha256 text NOT NULL CHECK (sha256 ~ '^[0-9a-f]{64}$'),
  status text NOT NULL DEFAULT 'uploaded' CHECK (status IN ('uploaded','processing','review_required','approved','failed')),
  safe_error_code text NULL,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT practice_source_creator_fkey FOREIGN KEY(created_by,institute_id) REFERENCES public.profiles(id,institute_id) ON DELETE RESTRICT,
  CONSTRAINT practice_source_hash_key UNIQUE(institute_id,sha256),
  CONSTRAINT practice_source_id_institute_key UNIQUE(id,institute_id)
);

CREATE TABLE public.practice_question_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institute_id uuid NOT NULL REFERENCES public.institutes(id) ON DELETE RESTRICT,
  source_file_id uuid NOT NULL,
  storage_bucket text NOT NULL DEFAULT 'practice-work-private',
  storage_path text NOT NULL,
  mime_type text NOT NULL,
  source_page integer NULL CHECK (source_page IS NULL OR source_page > 0),
  alt_text text NULL,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT practice_asset_source_fkey FOREIGN KEY(source_file_id,institute_id) REFERENCES public.practice_question_source_files(id,institute_id) ON DELETE RESTRICT,
  CONSTRAINT practice_asset_creator_fkey FOREIGN KEY(created_by,institute_id) REFERENCES public.profiles(id,institute_id) ON DELETE RESTRICT,
  CONSTRAINT practice_asset_path_key UNIQUE(storage_bucket,storage_path),
  CONSTRAINT practice_asset_id_institute_key UNIQUE(id,institute_id)
);

ALTER TABLE public.ai_question_generations
  ADD COLUMN source_type text NOT NULL DEFAULT 'ai',
  ADD COLUMN subject_id uuid NULL,
  ADD COLUMN source_full_marks numeric(10,2) NULL,
  ADD COLUMN question_exam_date date NULL,
  ADD COLUMN source_file_id uuid NULL;
ALTER TABLE public.ai_question_generations ALTER COLUMN template_id DROP NOT NULL;
ALTER TABLE public.ai_question_generations ALTER COLUMN model DROP NOT NULL;
ALTER TABLE public.ai_question_generations DROP CONSTRAINT ai_generations_status_check;
ALTER TABLE public.ai_question_generations ADD CONSTRAINT ai_generations_status_check CHECK(status IN ('uploaded','processing','pending','completed','review_required','reviewed','approved','failed'));
ALTER TABLE public.ai_question_generations ADD CONSTRAINT ai_generations_source_check CHECK(source_type IN ('ai','import'));
ALTER TABLE public.ai_question_generations ADD CONSTRAINT ai_generations_source_marks_check CHECK(source_full_marks IS NULL OR source_full_marks>0);
ALTER TABLE public.ai_question_generations ADD CONSTRAINT ai_generations_subject_fkey FOREIGN KEY(subject_id,institute_id) REFERENCES public.subjects(id,institute_id) ON DELETE RESTRICT;
ALTER TABLE public.ai_question_generations ADD CONSTRAINT ai_generations_source_file_fkey FOREIGN KEY(source_file_id,institute_id) REFERENCES public.practice_question_source_files(id,institute_id) ON DELETE RESTRICT;
ALTER TABLE public.ai_question_generations ADD CONSTRAINT ai_generations_source_requirements_check CHECK ((source_type='ai' AND template_id IS NOT NULL AND model IS NOT NULL) OR (source_type='import' AND source_file_id IS NOT NULL));

ALTER TABLE public.ai_generated_questions
  ADD COLUMN source_page integer NULL CHECK(source_page IS NULL OR source_page>0),
  ADD COLUMN source_reference text NULL,
  ADD COLUMN source_asset_id uuid NULL,
  ADD CONSTRAINT ai_generated_asset_fkey FOREIGN KEY(source_asset_id,institute_id) REFERENCES public.practice_question_assets(id,institute_id) ON DELETE RESTRICT;

ALTER TABLE public.question_bank
  ADD COLUMN subject_id uuid NULL,
  ADD COLUMN source_full_marks numeric(10,2) NULL,
  ADD COLUMN question_exam_date date NULL,
  ADD COLUMN source_file_id uuid NULL,
  ADD COLUMN source_page integer NULL,
  ADD COLUMN source_asset_id uuid NULL;
ALTER TABLE public.question_bank DROP CONSTRAINT question_bank_source_check;
ALTER TABLE public.question_bank ADD CONSTRAINT question_bank_source_check CHECK(source_type IN ('manual','ai','import'));
ALTER TABLE public.question_bank ADD CONSTRAINT question_bank_source_marks_check CHECK(source_full_marks IS NULL OR source_full_marks>0);
ALTER TABLE public.question_bank ADD CONSTRAINT question_bank_source_page_check CHECK(source_page IS NULL OR source_page>0);
ALTER TABLE public.question_bank ADD CONSTRAINT question_bank_subject_fkey FOREIGN KEY(subject_id,institute_id) REFERENCES public.subjects(id,institute_id) ON DELETE RESTRICT;
ALTER TABLE public.question_bank ADD CONSTRAINT question_bank_source_file_fkey FOREIGN KEY(source_file_id,institute_id) REFERENCES public.practice_question_source_files(id,institute_id) ON DELETE RESTRICT;
ALTER TABLE public.question_bank ADD CONSTRAINT question_bank_source_asset_fkey FOREIGN KEY(source_asset_id,institute_id) REFERENCES public.practice_question_assets(id,institute_id) ON DELETE RESTRICT;

ALTER TABLE public.question_templates ADD COLUMN blueprint jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX practice_source_files_institute_status_idx ON public.practice_question_source_files(institute_id,status,created_at DESC);
CREATE INDEX practice_question_assets_source_idx ON public.practice_question_assets(source_file_id);
CREATE INDEX ai_generations_institute_source_idx ON public.ai_question_generations(institute_id,source_type,created_at DESC);
CREATE INDEX question_bank_source_filters_idx ON public.question_bank(institute_id,source_type,subject_id,question_exam_date);
CREATE INDEX question_bank_metadata_filters_idx ON public.question_bank(institute_id,board_id,class_id,book_name,chapter);

ALTER TABLE public.practice_question_source_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.practice_question_assets ENABLE ROW LEVEL SECURITY;
CREATE POLICY practice_source_admin_all ON public.practice_question_source_files FOR ALL TO authenticated USING(public.practice_work_admin_scope(institute_id)) WITH CHECK(public.practice_work_admin_scope(institute_id));
CREATE POLICY practice_asset_admin_all ON public.practice_question_assets FOR ALL TO authenticated USING(public.practice_work_admin_scope(institute_id)) WITH CHECK(public.practice_work_admin_scope(institute_id));
GRANT SELECT,INSERT,UPDATE ON public.practice_question_source_files,public.practice_question_assets TO authenticated;

INSERT INTO storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
VALUES('practice-work-private','practice-work-private',false,15728640,ARRAY['application/pdf','application/vnd.openxmlformats-officedocument.wordprocessingml.document','image/jpeg','image/png'])
ON CONFLICT(id) DO UPDATE SET public=false,file_size_limit=EXCLUDED.file_size_limit,allowed_mime_types=EXCLUDED.allowed_mime_types;

CREATE POLICY practice_work_private_select ON storage.objects FOR SELECT TO authenticated USING(bucket_id='practice-work-private' AND public.practice_work_admin_scope(((storage.foldername(name))[2])::uuid) AND (storage.foldername(name))[1] IN ('question-imports','question-assets'));
CREATE POLICY practice_work_private_insert ON storage.objects FOR INSERT TO authenticated WITH CHECK(bucket_id='practice-work-private' AND public.practice_work_admin_scope(((storage.foldername(name))[2])::uuid) AND (storage.foldername(name))[1] IN ('question-imports','question-assets'));
CREATE POLICY practice_work_private_update ON storage.objects FOR UPDATE TO authenticated USING(bucket_id='practice-work-private' AND public.practice_work_admin_scope(((storage.foldername(name))[2])::uuid)) WITH CHECK(bucket_id='practice-work-private' AND public.practice_work_admin_scope(((storage.foldername(name))[2])::uuid));
CREATE POLICY practice_work_private_delete ON storage.objects FOR DELETE TO authenticated USING(bucket_id='practice-work-private' AND public.practice_work_admin_scope(((storage.foldername(name))[2])::uuid));

CREATE OR REPLACE FUNCTION public.seed_practice_question_templates() RETURNS integer LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE v_profile public.profiles%ROWTYPE; v_count integer;
BEGIN
 SELECT * INTO v_profile FROM public.profiles WHERE id=(SELECT auth.uid()) AND is_active IS TRUE;
 IF v_profile.id IS NULL OR NOT public.practice_work_admin_scope(v_profile.institute_id) THEN RAISE EXCEPTION 'PRACTICE_UNAUTHORIZED'; END IF;
 INSERT INTO public.question_templates(institute_id,name,question_type,instructions,prompt_rules,supports_options,requires_explanation,blueprint,created_by)
 SELECT v_profile.institute_id,x.name,x.question_type,x.instructions,x.prompt_rules,x.supports_options,true,x.blueprint,v_profile.id FROM (VALUES
 ('MIXED ENGLISH ASSESSMENT','short_answer','CREATE A BALANCED ENGLISH ASSESSMENT.','INCLUDE ACCURATE ANSWERS AND EXPLANATIONS.',true,'{"questionTypes":["mcq","fill_blank","short_answer"],"difficulty":{"beginner":30,"intermediate":50,"advanced":20}}'::jsonb),
 ('GRAMMAR PRACTICE','sentence_correction','FOCUS ON TENSE, ARTICLES, PREPOSITIONS, AGREEMENT, TRANSFORMATION AND ERROR CORRECTION.','INCLUDE ACCURATE ANSWERS AND EXPLANATIONS.',false,'{"focus":"grammar"}'::jsonb),
 ('READING COMPREHENSION','reading_comprehension','CREATE A PASSAGE WITH FACTUAL, VOCABULARY AND INFERENCE QUESTIONS.','INCLUDE ACCURATE ANSWERS AND EXPLANATIONS.',false,'{"focus":"reading"}'::jsonb),
 ('LITERATURE CHAPTER TEST','short_answer','USE THE SESSION BOOK AND CHAPTER CONTEXT FOR CHARACTERS, EVENTS, THEMES AND VOCABULARY.','INCLUDE SHORT AND LONG RESPONSES.',false,'{"focus":"literature"}'::jsonb),
 ('VOCABULARY PRACTICE','short_answer','USE MEANINGS, SYNONYMS, ANTONYMS, CONTEXT AND SENTENCE FORMATION.','INCLUDE ACCURATE ANSWERS AND EXPLANATIONS.',false,'{"focus":"vocabulary"}'::jsonb),
 ('WRITING SKILLS','short_answer','CREATE PARAGRAPH, LETTER, NOTICE, ARTICLE OR STORY PROMPTS.','PROVIDE MARKING GUIDANCE AND EXPLANATIONS.',false,'{"focus":"writing"}'::jsonb),
 ('QUICK REVISION TEST','mcq','CREATE A SHORT MIXED QUESTION SET FOR RAPID REVISION.','INCLUDE ACCURATE ANSWERS AND EXPLANATIONS.',true,'{"focus":"revision"}'::jsonb)
 ) AS x(name,question_type,instructions,prompt_rules,supports_options,blueprint)
 ON CONFLICT(institute_id,name) DO NOTHING;
 GET DIAGNOSTICS v_count=ROW_COUNT; RETURN v_count;
END $$;
REVOKE ALL ON FUNCTION public.seed_practice_question_templates() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.seed_practice_question_templates() TO authenticated;

COMMIT;
