import { redirect } from "next/navigation";
import { HistoryList } from "@/features/learning-planner/components/history-list";
import { PlannerShell } from "@/features/learning-planner/components/planner-shell";
import { listScheduleChanges } from "@/features/learning-planner/services/event-service";
import { requireRole } from "@/lib/auth/services/auth-service";
import { DASHBOARD_ROLES } from "@/lib/navigation";
export default async function HistoryPage(){const profile=await requireRole(DASHBOARD_ROLES);if(!profile.instituteId)redirect("/unauthorized");return <PlannerShell title="Schedule History" description="Review Schedule Event lifecycle changes. Administrators can remove individual history entries when required."><HistoryList changes={await listScheduleChanges(profile)}/></PlannerShell>}
