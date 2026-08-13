import { PracticeShell } from "@/features/practice-work/components/practice-shell";
import { PracticeWorkspace } from "@/features/practice-work/components/practice-workspace";
import { getGenerationReviewContext, listGeneratedQuestions } from "@/features/practice-work/services/ai-question-service";
import { listAssignments, listBankQuestions, listPracticeOptions, listPracticeSets, listTemplates } from "@/features/practice-work/services/practice-work-service";
import { requireRole } from "@/lib/auth/services/auth-service";
import { DASHBOARD_ROLES } from "@/lib/navigation";

type LoaderResult<T> = { data: T; error: null } | { data: null; error: string };

async function loadSection<T>(name: string, operation: Promise<T>): Promise<LoaderResult<T>> {
  try { return { data: await operation, error: null }; }
  catch (error) {
    const supabaseError = error as Partial<{ code: string; message: string; details: string; hint: string }>;
    console.error("Practice Work loader failed", { loader: name, code: supabaseError.code ?? "unknown", message: supabaseError.message ?? "Unknown error", details: supabaseError.details ?? null, hint: supabaseError.hint ?? null });
    return { data: null, error: `Unable to load ${name}. Please try again.` };
  }
}

export default async function PracticeWorkPage({ searchParams }: { searchParams: Promise<{ generation?: string }> }) {
  const profile = await requireRole(DASHBOARD_ROLES);
  const { generation } = await searchParams;
  const [templates, options, questions, sets, assignments, generatedQuestions, generationContext] = await Promise.all([
    loadSection("Question templates", listTemplates(profile)),
    loadSection("Practice Work options", listPracticeOptions(profile)),
    loadSection("saved Questions", listBankQuestions(profile)),
    loadSection("existing Practice Work", listPracticeSets(profile)),
    loadSection("assignments", listAssignments(profile)),
    generation ? loadSection("generation review", listGeneratedQuestions(profile, generation)) : Promise.resolve({ data: [], error: null } satisfies LoaderResult<never[]>),
    generation ? loadSection("generation context", getGenerationReviewContext(profile,generation)) : Promise.resolve({data:null,error:null} satisfies LoaderResult<null>),
  ]);
  return <PracticeShell title="Practice Work" description="Create, review, assemble and assign answer-backed Practice Work from one Administrator workspace."><PracticeWorkspace templates={templates.data ?? []} options={options.data} questions={questions.data} sets={sets.data} assignments={assignments.data} generationId={generation} generationContext={generationContext.data} generatedQuestions={generatedQuestions.data ?? []} errors={{ templates: templates.error, options: options.error, questions: questions.error, sets: sets.error, assignments: assignments.error, generation: generatedQuestions.error??generationContext.error }} /></PracticeShell>;
}
