import { PracticeShell } from "@/features/practice-work/components/practice-shell";
import { PracticeWorkspace } from "@/features/practice-work/components/practice-workspace";
import { listGeneratedQuestions } from "@/features/practice-work/services/ai-question-service";
import { listAssignments, listBankQuestions, listPracticeOptions, listPracticeSets, listTemplates } from "@/features/practice-work/services/practice-work-service";
import { requireRole } from "@/lib/auth/services/auth-service";
import { DASHBOARD_ROLES } from "@/lib/navigation";

export default async function PracticeWorkPage({ searchParams }: { searchParams: Promise<{ generation?: string }> }) {
  const profile = await requireRole(DASHBOARD_ROLES);
  const { generation } = await searchParams;
  const [templates, options, questions, sets, assignments, generatedQuestions] = await Promise.all([
    listTemplates(profile), listPracticeOptions(profile), listBankQuestions(profile), listPracticeSets(profile), listAssignments(profile), generation ? listGeneratedQuestions(profile, generation) : Promise.resolve([]),
  ]);
  return <PracticeShell title="Practice Work" description="Create, review, assemble and assign answer-backed Practice Work from one Administrator workspace."><PracticeWorkspace templates={templates} options={options} questions={questions} sets={sets} assignments={assignments} generationId={generation} generatedQuestions={generatedQuestions} /></PracticeShell>;
}
