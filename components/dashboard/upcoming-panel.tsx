import Link from "next/link";
import { CalendarDays } from "lucide-react";

import { DashboardSection } from "@/components/dashboard/dashboard-section";
import { EmptyState } from "@/components/dashboard/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { DashboardUpcomingEvent } from "@/features/dashboard/types/dashboard";

export function UpcomingPanel({ events }: { events: readonly DashboardUpcomingEvent[] }) {
  return (
    <DashboardSection title="Upcoming Planner Events" description="The next 14 days" action={<Button nativeButton={false} size="sm" variant="outline" render={<Link href="/learning-planner/calendar" />}>View Calendar</Button>} contentClassName="space-y-3">
      {events.length ? events.map((event) => <article key={event.id} className="rounded-xl border bg-background/60 p-3"><div className="flex items-start justify-between gap-3"><div><p className="font-medium">{event.title}</p><p className="mt-1 text-xs text-muted-foreground">{event.eventDate} · {event.startTime ?? "All day"}{event.batchName ? ` · ${event.batchName}` : ""}</p></div><Badge variant={event.status === "cancelled" ? "destructive" : "outline"}>{event.status}</Badge></div></article>) : <EmptyState icon={CalendarDays} title="No upcoming events" description="No Planner events are scheduled in the next 14 days." compact />}
    </DashboardSection>
  );
}
