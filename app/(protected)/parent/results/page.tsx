import { PageHeader } from "@/components/layout/page-header";
import { ParentResultsSummary } from "@/features/parent/components/parent-portal";
import { getExamResultSummaries, getParentChildren } from "@/features/parent/services/parent-service";
import { PublishedResultsList } from "@/features/learning-planner/components/published-results-list";
import { listPublishedResults } from "@/features/learning-planner/services/exam-result-service";
import { requireRole } from "@/lib/auth/services/auth-service";

export default async function Page() {
  const profile = await requireRole(["Parent"]);
  const linkedChildren = await getParentChildren(profile);
  const resultsByStudent: Record<string, Awaited<ReturnType<typeof getExamResultSummaries>>> = {};
  for (const child of linkedChildren) resultsByStudent[child.studentId] = await getExamResultSummaries(profile, child.studentId);
  const published = await listPublishedResults(profile);
  return <div className="space-y-6"><PageHeader title="Results" description="Published Exam Results for your linked children." /><ParentResultsSummary linkedChildren={linkedChildren} resultsByStudent={resultsByStudent} /><PublishedResultsList results={published} showStudent /></div>;
}
