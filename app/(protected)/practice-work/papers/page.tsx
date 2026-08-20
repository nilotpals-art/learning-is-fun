import { PracticeShell } from "@/features/practice-work/components/practice-shell";
import { QuestionPaperManager } from "@/features/practice-work/components/question-paper-manager";
import { listBankQuestions, listPracticeOptions, listPracticeSets } from "@/features/practice-work/services/practice-work-service";
import { requireRole } from "@/lib/auth/services/auth-service";
import { DASHBOARD_ROLES } from "@/lib/navigation";

export default async function QuestionPapersPage() {
  const profile = await requireRole(DASHBOARD_ROLES);
  const [papers, questions, options] = await Promise.all([
    listPracticeSets(profile),
    listBankQuestions(profile),
    listPracticeOptions(profile),
  ]);
  return <PracticeShell title="Question Papers" description="Generate, import, create manually, combine, edit, export and assign question papers from one place.">
    <QuestionPaperManager papers={papers} questions={questions} options={options} />
  </PracticeShell>;
}
