import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { StudentPageShell } from "@/features/student-dashboard/components/student-page-shell";
import { getStudentSchedule } from "@/features/student-dashboard/services/student-dashboard-service";
import { requireRole } from "@/lib/auth/services/auth-service";

export default async function StudentSchedulePage() {
  const profile = await requireRole(["Student"]);
  const events = await getStudentSchedule(profile);
  return <StudentPageShell title="My Schedule" description="Your classes and learning events for the next 30 days.">{events.length ? <div className="grid gap-3 lg:grid-cols-2">{events.map((event) => <Card key={event.id}><CardContent className="p-5"><div className="flex items-start justify-between gap-3"><div><p className="font-bold">{event.title}</p><p className="mt-1 text-sm text-muted-foreground">{event.eventDate} · {event.startTime ?? "All day"}{event.endTime ? `–${event.endTime}` : ""}</p></div><Badge variant="outline">{event.status}</Badge></div><p className="mt-3 text-sm text-muted-foreground">{[event.subjectName,event.batchName,event.scheduleType.replaceAll("_"," ")].filter(Boolean).join(" · ")}</p></CardContent></Card>)}</div> : <Card><CardContent className="p-8 text-center text-muted-foreground">No upcoming schedule events.</CardContent></Card>}</StudentPageShell>;
}
