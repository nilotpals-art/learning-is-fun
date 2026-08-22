import { redirect } from "next/navigation";
import { CalendarEventManager } from "@/features/learning-planner/components/calendar-event-manager";
import { PlannerShell } from "@/features/learning-planner/components/planner-shell";
import { listCalendarReadModel } from "@/features/learning-planner/services/calendar-projection-service";
import { listPlannerOptions } from "@/features/learning-planner/services/schedule-service";
import { requireRole } from "@/lib/auth/services/auth-service";
import { DASHBOARD_ROLES } from "@/lib/navigation";

export default async function CalendarPage() {
  const profile = await requireRole(DASHBOARD_ROLES);
  if (!profile.instituteId) redirect("/unauthorized");
  const today = new Date().toISOString().slice(0, 10);
  const toDate = `${new Date().getFullYear()}-12-31`;
  const [events, options] = await Promise.all([listCalendarReadModel(profile, today, toDate), listPlannerOptions(profile)]);
  return <PlannerShell title="Academic Calendar" description="Forthcoming class changes, tests, exams, and meetings only. Past events are hidden from Calendar and remain available in History."><CalendarEventManager events={events} options={options} /></PlannerShell>;
}
