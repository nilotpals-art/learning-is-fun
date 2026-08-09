import { redirect } from "next/navigation";
import { EventManager } from "@/features/learning-planner/components/event-manager";
import { PlannerShell } from "@/features/learning-planner/components/planner-shell";
import { listScheduleEvents } from "@/features/learning-planner/services/event-service";
import { listPlannerOptions } from "@/features/learning-planner/services/schedule-service";
import { requireRole } from "@/lib/auth/services/auth-service";
import { DASHBOARD_ROLES } from "@/lib/navigation";
export default async function EventsPage(){const profile=await requireRole(DASHBOARD_ROLES);if(!profile.instituteId)redirect("/unauthorized");const [events,options]=await Promise.all([listScheduleEvents(profile),listPlannerOptions(profile)]);return <PlannerShell title="Schedule Events" description="Create and manage dated learning events."><EventManager events={events} options={options}/></PlannerShell>}
