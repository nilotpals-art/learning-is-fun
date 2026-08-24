import { redirect } from "next/navigation";
import { CalendarEventManager } from "@/features/learning-planner/components/calendar-event-manager";
import { PlannerShell } from "@/features/learning-planner/components/planner-shell";
import { listCalendarReadModel } from "@/features/learning-planner/services/calendar-projection-service";
import { listPlannerOptions } from "@/features/learning-planner/services/schedule-service";
import { requireRole } from "@/lib/auth/services/auth-service";
import { DASHBOARD_ROLES } from "@/lib/navigation";

function dateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

export default async function CalendarPage() {
  const profile = await requireRole(DASHBOARD_ROLES);
  if (!profile.instituteId) redirect("/unauthorized");

  const now = new Date();
  const day = now.getUTCDay();
  const weekStart = new Date(now);
  weekStart.setUTCDate(now.getUTCDate() - (day === 0 ? 6 : day - 1));
  const rangeEnd = new Date(weekStart);
  rangeEnd.setUTCDate(rangeEnd.getUTCDate() + 370);

  const [events, options] = await Promise.all([
    listCalendarReadModel(profile, dateKey(weekStart), dateKey(rangeEnd)),
    listPlannerOptions(profile),
  ]);

  return <PlannerShell
    title="Weekly Academic Calendar"
    description="Weekly timetable of regular classes and planner events. Exams, mock tests, reschedules, cancellations, meetings and other changes appear directly against the relevant day."
  >
    <CalendarEventManager events={events} options={options} />
  </PlannerShell>;
}
