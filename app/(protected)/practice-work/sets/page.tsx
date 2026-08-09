import { PracticeSetManager } from "@/features/practice-work/components/practice-set-manager";
import { PracticeShell } from "@/features/practice-work/components/practice-shell";
import { listBankQuestions, listPracticeOptions, listPracticeSets } from "@/features/practice-work/services/practice-work-service";
import { requireRole } from "@/lib/auth/services/auth-service";
import { DASHBOARD_ROLES } from "@/lib/navigation";
export default async function SetsPage(){const profile=await requireRole(DASHBOARD_ROLES);const[sets,questions,options]=await Promise.all([listPracticeSets(profile),listBankQuestions(profile),listPracticeOptions(profile)]);return <PracticeShell title="Practice Sets" description="Build immutable Question snapshots and publish them for assignment."><PracticeSetManager sets={sets} questions={questions} options={options}/></PracticeShell>}
