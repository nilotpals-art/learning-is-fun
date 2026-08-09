"use client";

import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { EventManager } from "@/features/learning-planner/components/event-manager";
import { SCHEDULE_STATUSES, SCHEDULE_TYPES, type PlannerOptions, type ScheduleEvent } from "@/features/learning-planner/types/learning-planner";

export function CalendarEventManager({ events, options }: { events: ScheduleEvent[]; options: PlannerOptions }) {
  const [fromDate, setFromDate] = useState(""); const [toDate, setToDate] = useState("");
  const [batchId, setBatchId] = useState(""); const [eventType, setEventType] = useState(""); const [status, setStatus] = useState("");
  const filtered = useMemo(() => events.filter((event) =>
    (!fromDate || event.eventDate >= fromDate) && (!toDate || event.eventDate <= toDate)
    && (!batchId || event.batchId === batchId) && (!eventType || event.scheduleType === eventType)
    && (!status || event.status === status)
  ), [events, fromDate, toDate, batchId, eventType, status]);
  return <div className="space-y-6"><Card><CardContent className="grid gap-4 p-4 sm:grid-cols-2 xl:grid-cols-5"><label className="text-sm font-medium">From Date<Input type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} /></label><label className="text-sm font-medium">To Date<Input type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} /></label><label className="text-sm font-medium">Batch<select className="mt-1 h-10 w-full rounded-xl border bg-card px-3" value={batchId} onChange={(event) => setBatchId(event.target.value)}><option value="">All Batches</option>{options.batches.map((batch) => <option key={batch.id} value={batch.id}>{batch.label}</option>)}</select></label><label className="text-sm font-medium">Event Type<select className="mt-1 h-10 w-full rounded-xl border bg-card px-3" value={eventType} onChange={(event) => setEventType(event.target.value)}><option value="">All Types</option>{SCHEDULE_TYPES.map((type) => <option key={type} value={type}>{type.replaceAll("_", " ")}</option>)}</select></label><label className="text-sm font-medium">Status<select className="mt-1 h-10 w-full rounded-xl border bg-card px-3" value={status} onChange={(event) => setStatus(event.target.value)}><option value="">All Statuses</option>{SCHEDULE_STATUSES.map((value) => <option key={value} value={value}>{value}</option>)}</select></label></CardContent></Card><EventManager events={filtered} options={options}/></div>;
}
