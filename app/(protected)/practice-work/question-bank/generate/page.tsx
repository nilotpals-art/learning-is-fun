import { AiGenerationManager } from "@/features/practice-work/components/ai-generation-manager";
import { CreatePaperFromGenerationButton } from "@/features/practice-work/components/create-paper-from-generation-button";
import { PracticeShell } from "@/features/practice-work/components/practice-shell";
import { listGeneratedQuestions } from "@/features/practice-work/services/ai-question-service";
import { listPracticeOptions, listTemplates } from "@/features/practice-work/services/practice-work-service";
import { requireRole } from "@/lib/auth/services/auth-service";
import { DASHBOARD_ROLES } from "@/lib/navigation";

export default async function GeneratePage({ searchParams }: { searchParams: Promise<{ generation?: string }> }) {
  const profile = await requireRole(DASHBOARD_ROLES);
  const { generation } = await searchParams;
  const [templates, options, questions] = await Promise.all([
    listTemplates(profile),
    listPracticeOptions(profile),
    generation ? listGeneratedQuestions(profile, generation) : Promise.resolve([]),
  ]);
  return <PracticeShell title="Generate Questions" description="Generate structured drafts with AI, approve them, then turn the approved batch directly into an editable question paper.">
    <div className="space-y-5">
      {generation ? <CreatePaperFromGenerationButton generationId={generation} /> : null}
      <AiGenerationManager templates={templates} options={options} generationId={generation} questions={questions} />
    </div>
  </PracticeShell>;
}
