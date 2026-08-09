import { PracticeShell } from "@/features/practice-work/components/practice-shell";
import { TemplatesManager } from "@/features/practice-work/components/templates-manager";
import { listTemplates } from "@/features/practice-work/services/practice-work-service";
import { requireRole } from "@/lib/auth/services/auth-service";
import { DASHBOARD_ROLES } from "@/lib/navigation";
export default async function TemplatesPage(){const profile=await requireRole(DASHBOARD_ROLES);return <PracticeShell title="Question Templates" description="Manage reusable rules for manual and AI-assisted Questions."><TemplatesManager templates={await listTemplates(profile)}/></PracticeShell>}
