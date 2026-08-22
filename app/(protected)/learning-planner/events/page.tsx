import { redirect } from "next/navigation";

import { CalendarEventManager } from "@/features/learning-planner/components/calendar-event-manager";
import { PlannerShell } from "@/features/learning-planner/components/planner-shell";
import { listScheduleEvents } from "@/features/learning-planner/services/event-service";
import { listPlannerOptions } from "@/features/learning-planner/services/schedule-service";
import { requireRole } from "@/lib/auth/services/auth-service";
import { DASHBOARD_ROLES } from "@/lib/navigation";

function indiaToday(): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}

export default async function EventsPage() {
  const profile = await requireRole(DASHBOARD_ROLES);
  if (!profile.instituteId) redirect("/unauthorized");

  const today = indiaToday();
  const [events, options] = await Promise.all([
    listScheduleEvents(profile, { dateFrom: today }),
    listPlannerOptions(profile),
  ]);

  return (
    <PlannerShell
      title="Schedule Events"
      description="Forthcoming dated events only. Past events are hidden; persisted events can only be deleted from this page."
    >
      <CalendarEventManager events={events} options={options} />
    </PlannerShell>
  );
}
