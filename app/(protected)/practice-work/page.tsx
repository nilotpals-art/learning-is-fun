import { AiGenerationManager } from "@/features/practice-work/components/ai-generation-manager";
import { CreatePaperFromGenerationButton } from "@/features/practice-work/components/create-paper-from-generation-button";
import { PracticeShell } from "@/features/practice-work/components/practice-shell";
import { getGenerationReviewContext, listGeneratedQuestions } from "@/features/practice-work/services/ai-question-service";
import { listPracticeOptions, listTemplates } from "@/features/practice-work/services/practice-work-service";
import { requireRole } from "@/lib/auth/services/auth-service";
import { DASHBOARD_ROLES } from "@/lib/navigation";

export default async function PracticeWorkPage({ searchParams }: { searchParams: Promise<{ generation?: string }> }) {
  const profile = await requireRole(DASHBOARD_ROLES);
  const { generation } = await searchParams;
  const [templates, options, questions, generationContext] = await Promise.all([
    listTemplates(profile),
    listPracticeOptions(profile),
    generation ? listGeneratedQuestions(profile, generation) : Promise.resolve([]),
    generation ? getGenerationReviewContext(profile, generation) : Promise.resolve(null),
  ]);

  return <PracticeShell title="Import & Review" description="Temporary question creation workspace. Once approved questions are converted to a paper, manage the finished work only from Question Papers.">
    <div className="space-y-5">
      {generation ? <CreatePaperFromGenerationButton generationId={generation} /> : null}
      <AiGenerationManager templates={templates} options={options} generationId={generation} generationContext={generationContext} questions={questions} workspace />
    </div>
  </PracticeShell>;
}
