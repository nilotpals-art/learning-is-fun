import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PlannerShell } from "@/features/learning-planner/components/planner-shell";
import { listCalendarReadModel } from "@/features/learning-planner/services/calendar-projection-service";
import { listScheduleChanges } from "@/features/learning-planner/services/event-service";
import { requireRole } from "@/lib/auth/services/auth-service";
import { DASHBOARD_ROLES } from "@/lib/navigation";

export default async function LearningPlannerPage() {
  const profile = await requireRole(DASHBOARD_ROLES); if (!profile.instituteId) redirect("/unauthorized");
  const today = new Date().toISOString().slice(0, 10);
  const end = new Date(); end.setDate(end.getDate() + 90);
  const [events, changes] = await Promise.all([listCalendarReadModel(profile, today, end.toISOString().slice(0, 10)), listScheduleChanges(profile)]);
  const cards = [
    { label: "Classes Today", value: events.filter((event) => event.eventDate === today && event.status === "scheduled").length },
    { label: "Upcoming Events", value: events.length },
    { label: "Rescheduled", value: events.filter((event) => event.status === "rescheduled").length },
    { label: "Cancelled", value: events.filter((event) => event.status === "cancelled").length },
  ];
  const nextEvent = events.find((event) => event.status === "scheduled") ?? null;
  return <PlannerShell title="Learning Planner" description="A single view of classes, changes, and upcoming academic events."><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{cards.map((card) => <Card key={card.label}><CardHeader><CardTitle>{card.label}</CardTitle></CardHeader><CardContent className="text-3xl font-bold">{card.value}</CardContent></Card>)}</div><Card><CardHeader><CardTitle>Next Event</CardTitle></CardHeader><CardContent>{nextEvent ? <><p className="font-semibold">{nextEvent.title}</p><p className="text-sm text-muted-foreground">{nextEvent.eventDate} · {nextEvent.startTime ?? "All day"} · {nextEvent.batchName ?? "Institute-wide"}</p></> : <p className="text-muted-foreground">No upcoming events.</p>}</CardContent></Card><Card><CardHeader><CardTitle>Recent Schedule Changes</CardTitle></CardHeader><CardContent>{changes.length ? <ul className="space-y-2">{changes.slice(0, 5).map((change) => <li key={change.id} className="rounded-xl border p-3 text-sm"><span className="font-medium">{change.eventTitle}</span> · {change.changeType}</li>)}</ul> : <p className="text-muted-foreground">No Schedule changes yet.</p>}</CardContent></Card></PlannerShell>;
}
