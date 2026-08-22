"use client";

import { Trash2 } from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { deleteForthcomingPlannerEventAction } from "@/features/learning-planner/actions/delete-actions";
import { CALENDAR_EVENT_TYPES, SCHEDULE_STATUSES, type PlannerOptions, type ScheduleEvent } from "@/features/learning-planner/types/learning-planner";

export function CalendarEventManager({ events, options }: { events: ScheduleEvent[]; options: PlannerOptions }) {
  const router = useRouter();
  const today = new Date().toISOString().slice(0, 10);
  const [fromDate, setFromDate] = useState(today);
  const [toDate, setToDate] = useState("");
  const [batchId, setBatchId] = useState("");
  const [eventType, setEventType] = useState("");
  const [status, setStatus] = useState("");
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const filtered = useMemo(() => events.filter((event) =>
    event.eventDate >= today &&
    (!fromDate || event.eventDate >= fromDate) &&
    (!toDate || event.eventDate <= toDate) &&
    (!batchId || event.batchId === batchId) &&
    (!eventType || event.scheduleType === eventType) &&
    (!status || event.status === status) &&
    !(event.isProjected && event.scheduleType === "regular_class")
  ), [events, today, fromDate, toDate, batchId, eventType, status]);

  return <div className="space-y-6">
    <Card><CardContent className="grid gap-4 p-4 sm:grid-cols-2 xl:grid-cols-5">
      <label className="text-sm font-medium">From Date<Input type="date" min={today} value={fromDate} onChange={(event) => setFromDate(event.target.value < today ? today : event.target.value)} /></label>
      <label className="text-sm font-medium">To Date<Input type="date" min={today} value={toDate} onChange={(event) => setToDate(event.target.value)} /></label>
      <label className="text-sm font-medium">Batch<select className="mt-1 h-10 w-full rounded-xl border bg-card px-3" value={batchId} onChange={(event) => setBatchId(event.target.value)}><option value="">All Batches</option>{options.batches.map((batch) => <option key={batch.id} value={batch.id}>{batch.label}{batch.subjectName ? ` · ${batch.subjectName}` : ""}</option>)}</select></label>
      <label className="text-sm font-medium">Event Type<select className="mt-1 h-10 w-full rounded-xl border bg-card px-3" value={eventType} onChange={(event) => setEventType(event.target.value)}><option value="">All Types</option>{CALENDAR_EVENT_TYPES.map((type) => <option key={type} value={type}>{type.replaceAll("_", " ")}</option>)}</select></label>
      <label className="text-sm font-medium">Status<select className="mt-1 h-10 w-full rounded-xl border bg-card px-3" value={status} onChange={(event) => setStatus(event.target.value)}><option value="">All Statuses</option>{SCHEDULE_STATUSES.map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
    </CardContent></Card>

    {feedback ? <p className="text-sm" role="status">{feedback}</p> : null}
    <Card><CardContent className="pt-6"><div className="overflow-x-auto"><Table>
      <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Event</TableHead><TableHead>Batch</TableHead><TableHead>Time</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Action</TableHead></TableRow></TableHeader>
      <TableBody>{filtered.map((event) => <TableRow key={event.id}>
        <TableCell>{event.eventDate}</TableCell>
        <TableCell><span className="font-medium">{event.title}</span><span className="block text-xs text-muted-foreground">{event.scheduleType.replaceAll("_", " ")}</span></TableCell>
        <TableCell>{event.batchName ?? "—"}</TableCell>
        <TableCell>{event.startTime ? `${event.startTime}${event.endTime ? `–${event.endTime}` : ""}` : "—"}</TableCell>
        <TableCell><Badge variant="outline">{event.status}</Badge></TableCell>
        <TableCell className="text-right">{event.isProjected ? <span className="text-xs text-muted-foreground">Normal schedule</span> : <Button type="button" size="sm" variant="destructive" disabled={pending} onClick={() => { if (!window.confirm(`Delete ${event.title} everywhere?`)) return; setPendingId(event.id); start(async () => { const result = await deleteForthcomingPlannerEventAction(event.id); setFeedback(result.message); setPendingId(null); if (result.status === "success") router.refresh(); }); }}><Trash2 />{pendingId === event.id ? "Deleting…" : "Delete"}</Button>}</TableCell>
      </TableRow>)}{filtered.length === 0 ? <TableRow><TableCell colSpan={6} className="py-10 text-center text-muted-foreground">No forthcoming events.</TableCell></TableRow> : null}</TableBody>
    </Table></div></CardContent></Card>
  </div>;
}
