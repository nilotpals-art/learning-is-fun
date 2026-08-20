import "server-only";

import type { AuthProfile } from "@/features/auth/types/auth";
import { normalizeQuestionText } from "@/features/practice-work/services/practice-work-service";
import { createClient } from "@/lib/supabase/server";

type QuestionRow = {
  id: string;
  board_id: string | null;
  class_id: string | null;
  question_type: string;
  question_text: string;
  options: unknown;
  correct_answer: unknown;
  accepted_answers: unknown;
  answer_explanation: string | null;
  difficulty: string;
  suggested_marks: number | string | null;
};

type PaperRow = { id: string; academic_year_id: string; board_id: string | null; class_id: string | null };
type SnapshotRow = { practice_set_id: string; question_bank_id: string | null; question_type: string; question_text: string; options: unknown; correct_answer: unknown; accepted_answers: unknown; answer_explanation: string | null; difficulty: string; marks: number | string; display_order: number };
type GenerationRow = { id: string; source_type: "ai" | "import"; source_file_id: string | null };

function institute(profile: AuthProfile) {
  if (!profile.instituteId) throw new Error("PRACTICE_UNAUTHORIZED");
  return profile.instituteId;
}
function safePart(value: string | null | undefined, fallback: string) { return (value?.trim() || fallback).toUpperCase().replace(/[^A-Z0-9]+/g, "_").replace(/^_+|_+$/g, ""); }
function datePart() { const now = new Date(); return `${String(now.getDate()).padStart(2, "0")}-${String(now.getMonth() + 1).padStart(2, "0")}-${now.getFullYear()}`; }
export function defaultPaperName(board: string | null | undefined, academicClass: string | null | undefined, paperType: string) { return `${safePart(board, "BOARD")}_${safePart(academicClass, "CLASS")}_${safePart(paperType, "PRACTICE")}_${datePart()}`; }

async function resolveNames(boardId: string | null, classId: string | null) {
  const s = await createClient();
  const [board, academicClass] = await Promise.all([
    boardId ? s.from("boards").select("name").eq("id", boardId).maybeSingle() : Promise.resolve({ data: null }),
    classId ? s.from("academic_classes").select("class_name").eq("id", classId).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  return { boardName: (board.data as { name?: string } | null)?.name ?? null, className: (academicClass.data as { class_name?: string } | null)?.class_name ?? null };
}

export async function createQuestionPaper(profile: AuthProfile, input: { academicYearId: string; questionIds: string[]; paperType: string; instructions?: string }) {
  const s = await createClient();
  const instituteId = institute(profile);
  const ids = [...new Set(input.questionIds)];
  if (!ids.length) throw new Error("PAPER_QUESTIONS_REQUIRED");
  const [{ data: year }, questionResult] = await Promise.all([
    s.from("academic_years").select("id").eq("id", input.academicYearId).eq("institute_id", instituteId).maybeSingle(),
    s.from("question_bank").select("id,board_id,class_id,question_type,question_text,options,correct_answer,accepted_answers,answer_explanation,difficulty,suggested_marks").eq("institute_id", instituteId).eq("is_active", true).in("id", ids),
  ]);
  const questions = questionResult.data as unknown as QuestionRow[] | null;
  if (!year || questionResult.error || !questions || questions.length !== ids.length) throw new Error("PRACTICE_QUESTION_INVALID");
  const ordered = ids.map((id) => questions.find((q) => q.id === id)).filter((q): q is QuestionRow => Boolean(q));
  const first = ordered[0];
  if (!first) throw new Error("PAPER_QUESTIONS_REQUIRED");
  const names = await resolveNames(first.board_id, first.class_id);
  const title = defaultPaperName(names.boardName, names.className, input.paperType);
  const total = ordered.reduce((sum, q) => sum + Number(q.suggested_marks ?? 1), 0);
  const { data: paper, error: paperError } = await s.from("practice_sets").insert({ institute_id: instituteId, academic_year_id: input.academicYearId, board_id: first.board_id, class_id: first.class_id, title, description: input.paperType.trim().toUpperCase(), instructions: input.instructions?.trim() || "ANSWER ALL QUESTIONS.", answer_mode: "after_completion", allow_retry: false, marks_mode: "custom", target_total_marks: total, status: "draft", created_by: profile.id }).select("id").single();
  if (paperError || !paper) throw paperError ?? new Error("PAPER_CREATE_FAILED");
  const { error: snapshotError } = await s.from("practice_set_questions").insert(ordered.map((q, index) => ({ institute_id: instituteId, practice_set_id: paper.id, question_bank_id: q.id, question_type: q.question_type, question_text: q.question_text, options: q.options, correct_answer: q.correct_answer, accepted_answers: q.accepted_answers, answer_explanation: q.answer_explanation, difficulty: q.difficulty, marks: Number(q.suggested_marks ?? 1), display_order: index + 1 })));
  if (snapshotError) throw snapshotError;
  return paper.id as string;
}

export async function createQuestionPaperFromGeneration(profile: AuthProfile, generationId: string) {
  const s = await createClient();
  const instituteId = institute(profile);
  const [generationResult, yearResult] = await Promise.all([
    s.from("ai_question_generations").select("id,source_type,source_file_id").eq("id", generationId).eq("institute_id", instituteId).maybeSingle(),
    s.from("academic_years").select("id").eq("institute_id", instituteId).eq("is_active", true).order("start_date", { ascending: false }).limit(1).maybeSingle(),
  ]);
  const generation = generationResult.data as unknown as GenerationRow | null;
  if (generationResult.error || !generation || yearResult.error || !yearResult.data) throw new Error("PAPER_GENERATION_INVALID");

  const questionResult = generation.source_type === "import"
    ? generation.source_file_id
      ? await s.from("question_bank").select("id").eq("institute_id", instituteId).eq("source_file_id", generation.source_file_id).eq("is_active", true).order("created_at")
      : { data: null, error: new Error("PAPER_GENERATION_INVALID") }
    : await s.from("question_bank").select("id").eq("institute_id", instituteId).eq("ai_generation_id", generation.id).eq("is_active", true).order("created_at");
  if (questionResult.error || !questionResult.data?.length) throw new Error("PAPER_APPROVED_QUESTIONS_REQUIRED");

  return createQuestionPaper(profile, {
    academicYearId: yearResult.data.id as string,
    questionIds: questionResult.data.map((row) => row.id as string),
    paperType: generation.source_type === "import" ? "IMPORTED" : "PRACTICE",
    instructions: "ANSWER ALL QUESTIONS.",
  });
}

export async function combineQuestionPapers(profile: AuthProfile, input: { sourcePaperIds: string[]; paperType: string }) {
  const s = await createClient();
  const instituteId = institute(profile);
  const ids = [...new Set(input.sourcePaperIds)];
  if (ids.length < 2 || ids.length > 3) throw new Error("PAPER_COMBINE_COUNT");
  const [paperResult, snapshotResult] = await Promise.all([
    s.from("practice_sets").select("id,academic_year_id,board_id,class_id").eq("institute_id", instituteId).in("id", ids),
    s.from("practice_set_questions").select("practice_set_id,question_bank_id,question_type,question_text,options,correct_answer,accepted_answers,answer_explanation,difficulty,marks,display_order").eq("institute_id", instituteId).in("practice_set_id", ids),
  ]);
  const papers = paperResult.data as unknown as PaperRow[] | null;
  const snapshots = snapshotResult.data as unknown as SnapshotRow[] | null;
  if (paperResult.error || snapshotResult.error || !papers || papers.length !== ids.length || !snapshots) throw new Error("PAPER_SOURCE_INVALID");
  const first = papers.find((p) => p.id === ids[0]);
  if (!first) throw new Error("PAPER_SOURCE_INVALID");
  const names = await resolveNames(first.board_id, first.class_id);
  const title = defaultPaperName(names.boardName, names.className, input.paperType || "COMBINED");
  const unique = new Map<string, SnapshotRow>();
  for (const paperId of ids) for (const q of snapshots.filter((row) => row.practice_set_id === paperId).sort((a, b) => a.display_order - b.display_order)) { const key = normalizeQuestionText(q.question_text); if (!unique.has(key)) unique.set(key, q); }
  const questions = [...unique.values()];
  if (!questions.length) throw new Error("PAPER_QUESTIONS_REQUIRED");
  const total = questions.reduce((sum, q) => sum + Number(q.marks), 0);
  const { data: paper, error: insertError } = await s.from("practice_sets").insert({ institute_id: instituteId, academic_year_id: first.academic_year_id, board_id: first.board_id, class_id: first.class_id, title, description: (input.paperType || "COMBINED").trim().toUpperCase(), instructions: "ANSWER ALL QUESTIONS.", answer_mode: "after_completion", allow_retry: false, marks_mode: "custom", target_total_marks: total, status: "draft", created_by: profile.id }).select("id").single();
  if (insertError || !paper) throw insertError ?? new Error("PAPER_CREATE_FAILED");
  const { error: qError } = await s.from("practice_set_questions").insert(questions.map((q, index) => ({ institute_id: instituteId, practice_set_id: paper.id, question_bank_id: q.question_bank_id, question_type: q.question_type, question_text: q.question_text, options: q.options, correct_answer: q.correct_answer, accepted_answers: q.accepted_answers, answer_explanation: q.answer_explanation, difficulty: q.difficulty, marks: Number(q.marks), display_order: index + 1 })));
  if (qError) throw qError;
  return paper.id as string;
}

export async function updateDraftQuestionPaper(profile: AuthProfile, input: { paperId: string; title: string; instructions?: string; questions: { id: string; questionText: string; marks: number; displayOrder: number }[] }) {
  const s = await createClient();
  const instituteId = institute(profile);
  const { data: paper } = await s.from("practice_sets").select("id,status").eq("id", input.paperId).eq("institute_id", instituteId).maybeSingle();
  if (!paper || paper.status !== "draft") throw new Error("PAPER_NOT_EDITABLE");
  const total = input.questions.reduce((sum, q) => sum + q.marks, 0);
  const { error: setError } = await s.from("practice_sets").update({ title: input.title.trim().toUpperCase(), instructions: input.instructions?.trim() || null, target_total_marks: total }).eq("id", paper.id).eq("institute_id", instituteId);
  if (setError) throw setError;
  for (const q of input.questions) { const { error } = await s.from("practice_set_questions").update({ question_text: q.questionText.trim().toUpperCase(), marks: q.marks, display_order: q.displayOrder }).eq("id", q.id).eq("practice_set_id", paper.id).eq("institute_id", instituteId); if (error) throw error; }
}
