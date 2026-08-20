import { PracticeShell } from "@/features/practice-work/components/practice-shell";
import { QuestionPaperPdfSettingsManager } from "@/features/practice-work/components/question-paper-pdf-settings-manager";
import { getQuestionPaperPdfSettings } from "@/features/practice-work/services/question-paper-pdf-settings-service";
import { requireRole } from "@/lib/auth/services/auth-service";
import { DASHBOARD_ROLES } from "@/lib/navigation";

export default async function QuestionPaperPdfSettingsPage() {
  const profile = await requireRole(DASHBOARD_ROLES);
  const settings = await getQuestionPaperPdfSettings(profile);
  return <PracticeShell title="Question Paper PDF Settings" description="Configure the institute default letterhead, watermark, footer and A4 layout without changing source code.">
    <QuestionPaperPdfSettingsManager initial={settings}/>
  </PracticeShell>;
}
