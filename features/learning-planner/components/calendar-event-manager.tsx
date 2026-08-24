"use client";

import { CalendarDays, ChevronLeft, ChevronRight, RotateCcw, Trash2 } from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { deleteForthcomingPlannerEventAction } from "@/features/learning-planner/actions/delete-actions";
import { CALENDAR_EVENT_TYPES, SCHEDULE_STATUSES, type PlannerOptions, type ScheduleEvent } from "@/features/learning-planner/types/learning-planner";

const DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] as const;

function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function fromDateKey(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function addDays(date: Date, amount: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

function startOfWeek(date: Date) {
  const day = date.getDay();
  return addDays(date, -(day === 0 ? 6 : day - 1));
}

function formatDay(date: Date) {
  return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "2-digit", year: "numeric" }).format(date);
}

function formatRange(start: Date, end: Date) {
  const formatter = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" });
  return `${formatter.format(start)} – ${formatter.format(end)}`;
}

function isoWeekNumber(date: Date) {
  const copy = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = copy.getUTCDay() || 7;
  copy.setUTCDate(copy.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(copy.getUTCFullYear(), 0, 1));
  return Math.ceil((((copy.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

function displayTime(value: string | null) {
  if (!value) return "";
  const [hourText, minuteText] = value.split(":");
  const hour = Number(hourText);
  const suffix = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${minuteText} ${suffix}`;
}

function eventTone(event: ScheduleEvent) {
  if (event.status === "cancelled") return "border-red-300 bg-red-50 text-red-950 dark:border-red-900 dark:bg-red-950/30 dark:text-red-100";
  if (event.status === "rescheduled") return "border-orange-300 bg-orange-50 text-orange-950 dark:border-orange-900 dark:bg-orange-950/30 dark:text-orange-100";
  switch (event.scheduleType) {
    case "exam": return "border-rose-300 bg-rose-50 text-rose-950 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-100";
    case "mock_test": return "border-amber-300 bg-amber-50 text-amber-950 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100";
    case "extra_class": return "border-violet-300 bg-violet-50 text-violet-950 dark:border-violet-900 dark:bg-violet-950/30 dark:text-violet-100";
    case "parent_meeting": return "border-teal-300 bg-teal-50 text-teal-950 dark:border-teal-900 dark:bg-teal-950/30 dark:text-teal-100";
    case "holiday": return "border-slate-300 bg-slate-100 text-slate-950 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100";
    default: return "border-blue-200 bg-blue-50 text-blue-950 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-100";
  }
}

function typeLabel(event: ScheduleEvent) {
  if (event.status === "cancelled") return "No class";
  if (event.status === "rescheduled") return "Rescheduled";
  if (event.isProjected && event.scheduleType === "regular_class") return "Regular class";
  return event.scheduleType.replaceAll("_", " ");
}

export function CalendarEventManager({ events, options }: { events: ScheduleEvent[]; options: PlannerOptions }) {
  const router = useRouter();
  const today = new Date();
  const currentWeekStart = startOfWeek(today);
  const [weekStartKey, setWeekStartKey] = useState(() => toDateKey(currentWeekStart));
  const [batchId, setBatchId] = useState("");
  const [eventType, setEventType] = useState("");
  const [status, setStatus] = useState("");
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const weekStart = fromDateKey(weekStartKey);
  const days = useMemo(() => Array.from({ length: 7 }, (_, index) => addDays(weekStart, index)), [weekStartKey]);
  const weekEnd = days[6];
  const weekStartDate = toDateKey(weekStart);
  const weekEndDate = toDateKey(weekEnd);

  const filtered = useMemo(() => events.filter((event) =>
    event.eventDate >= weekStartDate &&
    event.eventDate <= weekEndDate &&
    (!batchId || event.batchId === batchId) &&
    (!eventType || event.scheduleType === eventType) &&
    (!status || event.status === status)
  ).sort((a, b) => `${a.eventDate}-${a.startTime ?? "99:99"}-${a.batchName ?? ""}`.localeCompare(`${b.eventDate}-${b.startTime ?? "99:99"}-${b.batchName ?? ""}`)), [events, weekStartDate, weekEndDate, batchId, eventType, status]);

  const eventsByDate = useMemo(() => {
    const map = new Map<string, ScheduleEvent[]>();
    for (const event of filtered) {
      const list = map.get(event.eventDate) ?? [];
      list.push(event);
      map.set(event.eventDate, list);
    }
    return map;
  }, [filtered]);

  const academicYear = filtered.find((event) => event.academicYearName)?.academicYearName ?? events.find((event) => event.academicYearName)?.academicYearName ?? "Current Session";
  const canGoPrevious = weekStartKey > toDateKey(currentWeekStart);

  const moveWeek = (amount: number) => setWeekStartKey(toDateKey(addDays(weekStart, amount * 7)));

  return <div className="space-y-5">
    <Card className="overflow-hidden">
      <CardContent className="space-y-4 p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground"><CalendarDays className="size-4" />Academic Session {academicYear}</div>
            <h2 className="mt-1 text-xl font-bold">Week {isoWeekNumber(weekStart)} · {formatRange(weekStart, weekEnd)}</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" disabled={!canGoPrevious} onClick={() => moveWeek(-1)}><ChevronLeft />Previous</Button>
            <Button type="button" variant="outline" size="sm" onClick={() => setWeekStartKey(toDateKey(currentWeekStart))}><RotateCcw />This Week</Button>
            <Button type="button" variant="outline" size="sm" onClick={() => moveWeek(1)}>Next<ChevronRight /></Button>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <label className="text-sm font-medium">Batch
            <select className="mt-1 h-10 w-full rounded-xl border bg-card px-3" value={batchId} onChange={(event) => setBatchId(event.target.value)}>
              <option value="">All Batches</option>
              {options.batches.map((batch) => <option key={batch.id} value={batch.id}>{batch.label}{batch.subjectName ? ` · ${batch.subjectName}` : ""}</option>)}
            </select>
          </label>
          <label className="text-sm font-medium">Event Type
            <select className="mt-1 h-10 w-full rounded-xl border bg-card px-3" value={eventType} onChange={(event) => setEventType(event.target.value)}>
              <option value="">All Types</option>
              {CALENDAR_EVENT_TYPES.map((type) => <option key={type} value={type}>{type.replaceAll("_", " ")}</option>)}
            </select>
          </label>
          <label className="text-sm font-medium">Status
            <select className="mt-1 h-10 w-full rounded-xl border bg-card px-3" value={status} onChange={(event) => setStatus(event.target.value)}>
              <option value="">All Statuses</option>
              {SCHEDULE_STATUSES.map((value) => <option key={value} value={value}>{value}</option>)}
            </select>
          </label>
        </div>
      </CardContent>
    </Card>

    {feedback ? <p className="text-sm" role="status">{feedback}</p> : null}

    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <div className="min-w-[1120px]">
          <div className="grid grid-cols-7 border-b bg-muted/40">
            {days.map((day, index) => {
              const dateKey = toDateKey(day);
              const isToday = dateKey === toDateKey(today);
              return <div key={dateKey} className={`border-r px-3 py-3 text-center last:border-r-0 ${isToday ? "bg-primary/10" : ""}`}>
                <div className="text-xs font-bold uppercase tracking-wide">{DAY_NAMES[index]}</div>
                <div className="mt-1 text-sm font-semibold">{formatDay(day)}</div>
                {isToday ? <Badge className="mt-2" variant="secondary">Today</Badge> : null}
              </div>;
            })}
          </div>

          <div className="grid grid-cols-7 items-stretch">
            {days.map((day) => {
              const dateKey = toDateKey(day);
              const dayEvents = eventsByDate.get(dateKey) ?? [];
              return <section key={dateKey} className="min-h-[420px] border-r p-2 last:border-r-0">
                <div className="space-y-2">
                  {dayEvents.map((event) => <article key={`${event.id}-${event.eventDate}`} className={`rounded-xl border p-2.5 shadow-sm ${eventTone(event)}`}>
                    <div className="flex items-start justify-between gap-1">
                      <div className="min-w-0">
                        <div className="truncate text-xs font-bold uppercase tracking-wide">{event.batchName ?? event.title}</div>
                        {event.subjectName ? <div className="mt-0.5 truncate text-xs opacity-75">{event.subjectName}</div> : null}
                      </div>
                      {!event.isProjected ? <Button type="button" variant="ghost" size="icon-sm" className="size-6 shrink-0" aria-label={`Delete ${event.title}`} disabled={pending} onClick={() => {
                        if (!window.confirm(`Delete ${event.title} everywhere?`)) return;
                        setPendingId(event.id);
                        start(async () => {
                          const result = await deleteForthcomingPlannerEventAction(event.id);
                          setFeedback(result.message);
                          setPendingId(null);
                          if (result.status === "success") router.refresh();
                        });
                      }}><Trash2 className="size-3.5" /></Button> : null}
                    </div>
                    {event.startTime ? <div className="mt-2 text-sm font-bold">{displayTime(event.startTime)}{event.endTime ? ` – ${displayTime(event.endTime)}` : ""}</div> : null}
                    <div className="mt-1 text-xs capitalize">{typeLabel(event)}{pendingId === event.id ? " · deleting…" : ""}</div>
                    {event.title && event.title !== event.batchName ? <div className="mt-1 text-xs font-medium">{event.title}</div> : null}
                    {event.room ? <div className="mt-1 text-[11px] opacity-70">Room: {event.room}</div> : null}
                  </article>)}
                  {dayEvents.length === 0 ? <div className="flex min-h-28 items-center justify-center rounded-xl border border-dashed p-3 text-center text-xs text-muted-foreground">No classes or events</div> : null}
                </div>
              </section>;
            })}
          </div>
        </div>
      </div>
    </Card>

    <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted-foreground">
      <span><span className="font-semibold text-blue-700 dark:text-blue-300">■</span> Regular class</span>
      <span><span className="font-semibold text-rose-700 dark:text-rose-300">■</span> Exam</span>
      <span><span className="font-semibold text-amber-700 dark:text-amber-300">■</span> Mock test</span>
      <span><span className="font-semibold text-orange-700 dark:text-orange-300">■</span> Rescheduled</span>
      <span><span className="font-semibold text-red-700 dark:text-red-300">■</span> No class / Cancelled</span>
      <span><span className="font-semibold text-teal-700 dark:text-teal-300">■</span> Parent meeting</span>
    </div>
  </div>;
}
