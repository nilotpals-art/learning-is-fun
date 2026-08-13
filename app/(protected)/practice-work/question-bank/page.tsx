import { PracticeShell } from "@/features/practice-work/components/practice-shell";
import { QuestionBankManager } from "@/features/practice-work/components/question-bank-manager";
import { listBankQuestions, listPracticeOptions, listTemplates } from "@/features/practice-work/services/practice-work-service";
import { requireRole } from "@/lib/auth/services/auth-service";
import { DASHBOARD_ROLES } from "@/lib/navigation";
export default async function QuestionBankPage(){const profile=await requireRole(DASHBOARD_ROLES);const[questions,options,templates]=await Promise.all([listBankQuestions(profile),listPracticeOptions(profile),listTemplates(profile)]);return <PracticeShell title="Question Bank" description="Browse, filter, and reuse approved institute-scoped Questions."><QuestionBankManager questions={questions} options={options} templates={templates}/></PracticeShell>}
