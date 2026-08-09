import { redirect } from "next/navigation";
import { CalendarEventManager } from "@/features/learning-planner/components/calendar-event-manager";
import { PlannerShell } from "@/features/learning-planner/components/planner-shell";
import { listScheduleEvents } from "@/features/learning-planner/services/event-service";
import { listPlannerOptions } from "@/features/learning-planner/services/schedule-service";
import { requireRole } from "@/lib/auth/services/auth-service";
import { DASHBOARD_ROLES } from "@/lib/navigation";
export default async function CalendarPage(){const profile=await requireRole(DASHBOARD_ROLES);if(!profile.instituteId)redirect("/unauthorized");const [events,options]=await Promise.all([listScheduleEvents(profile),listPlannerOptions(profile)]);return <PlannerShell title="Academic Calendar" description="Browse dated classes, tests, meetings, holidays, and special events."><CalendarEventManager events={events} options={options}/></PlannerShell>}
