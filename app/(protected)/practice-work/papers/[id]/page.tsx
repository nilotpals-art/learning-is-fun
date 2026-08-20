import { notFound } from "next/navigation";

import { PracticeShell } from "@/features/practice-work/components/practice-shell";
import { QuestionPaperEditor } from "@/features/practice-work/components/question-paper-editor";
import { listPracticeSets } from "@/features/practice-work/services/practice-work-service";
import { requireRole } from "@/lib/auth/services/auth-service";
import { DASHBOARD_ROLES } from "@/lib/navigation";

export default async function QuestionPaperPage({ params }: { params: Promise<{ id: string }> }) {
  const profile = await requireRole(DASHBOARD_ROLES);
  const { id } = await params;
  const paper = (await listPracticeSets(profile)).find((item) => item.id === id);
  if (!paper) notFound();
  return <PracticeShell title={paper.title} description="Edit the complete paper, preview it as a page, export PDF, assign it, or share it on WhatsApp.">
    <QuestionPaperEditor paper={paper} />
  </PracticeShell>;
}
