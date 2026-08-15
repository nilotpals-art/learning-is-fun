"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, Clock3, Layers3, Plus, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { createClassScheduleAction, deactivateClassScheduleAction } from "@/features/learning-planner/actions/schedule-actions";
import { SCHEDULE_TYPES, type ClassSchedule, type PlannerOptions } from "@/features/learning-planner/types/learning-planner";

const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export function ScheduleManager({ schedules, options }: { schedules: ClassSchedule[]; options: PlannerOptions }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [feedback, setFeedback] = useState<string | null>(null);
  const [batchFilter, setBatchFilter] = useState("");
  const [dayFilter, setDayFilter] = useState("");
  const [query, setQuery] = useState("");

  const visibleSchedules = useMemo(() => schedules.filter((schedule) => {
    const text = `${schedule.batchName} ${schedule.subjectName ?? ""} ${schedule.room ?? ""}`.toLowerCase();
    return (!batchFilter || schedule.batchId === batchFilter) && (!dayFilter || schedule.dayOfWeek === Number(dayFilter)) && (!query || text.includes(query.toLowerCase()));
  }), [schedules, batchFilter, dayFilter, query]);

  const submit = (form: FormData) => start(async () => {
    setFeedback(null);
    const result = await createClassScheduleAction({ academicYearId: form.get("academicYearId"), batchId: form.get("batchId"), subjectId: form.get("subjectId"), dayOfWeek: form.get("dayOfWeek"), startTime: form.get("startTime"), endTime: form.get("endTime"), scheduleType: form.get("scheduleType"), room: form.get("room"), effectiveFrom: form.get("effectiveFrom") });
    setFeedback(result.message);
    if (result.status === "success") router.refresh();
  });

  const deactivate = (id: string) => start(async () => {
    const result = await deactivateClassScheduleAction({ id });
    setFeedback(result.message);
    if (result.status === "success") router.refresh();
  });

  const activeCount = schedules.filter((schedule) => schedule.isActive).length;
  const batchCount = new Set(schedules.filter((schedule) => schedule.isActive).map((schedule) => schedule.batchId)).size;

  return <div className="space-y-6">
    <div className="grid gap-4 sm:grid-cols-3">
      <Card><CardContent className="flex items-center gap-3 p-4"><div className="rounded-xl bg-primary/10 p-2"><CalendarDays className="size-5 text-primary"/></div><div><p className="text-2xl font-semibold">{activeCount}</p><p className="text-sm text-muted-foreground">Active weekly slots</p></div></CardContent></Card>
      <Card><CardContent className="flex items-center gap-3 p-4"><div className="rounded-xl bg-primary/10 p-2"><Layers3 className="size-5 text-primary"/></div><div><p className="text-2xl font-semibold">{batchCount}</p><p className="text-sm text-muted-foreground">Scheduled batches</p></div></CardContent></Card>
      <Card><CardContent className="flex items-center gap-3 p-4"><div className="rounded-xl bg-primary/10 p-2"><Clock3 className="size-5 text-primary"/></div><div><p className="text-2xl font-semibold">7</p><p className="text-sm text-muted-foreground">Days available</p></div></CardContent></Card>
    </div>

    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2"><Plus className="size-5"/>Create Batch Schedule</CardTitle><p className="text-sm text-muted-foreground">Create a recurring weekly slot for a batch. Existing server-side conflict and tenant checks remain authoritative.</p></CardHeader>
      <CardContent><form action={submit} className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <label className="text-sm font-medium">Academic Year<select name="academicYearId" required className="mt-1 h-10 w-full rounded-xl border bg-card px-3">{options.academicYears.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}</select></label>
        <label className="text-sm font-medium">Batch<select name="batchId" required className="mt-1 h-10 w-full rounded-xl border bg-card px-3">{options.batches.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}</select></label>
        <label className="text-sm font-medium">Subject<select name="subjectId" className="mt-1 h-10 w-full rounded-xl border bg-card px-3"><option value="">Not applicable</option>{options.subjects.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}</select></label>
        <label className="text-sm font-medium">Schedule Type<select name="scheduleType" className="mt-1 h-10 w-full rounded-xl border bg-card px-3">{SCHEDULE_TYPES.filter((type) => type !== "holiday").map((type) => <option key={type} value={type}>{type.replaceAll("_", " ")}</option>)}</select></label>
        <label className="text-sm font-medium">Day<select name="dayOfWeek" className="mt-1 h-10 w-full rounded-xl border bg-card px-3">{days.map((day, index) => <option key={day} value={index + 1}>{day}</option>)}</select></label>
        <label className="text-sm font-medium">Start Time<Input name="startTime" type="time" required /></label>
        <label className="text-sm font-medium">End Time<Input name="endTime" type="time" required /></label>
        <label className="text-sm font-medium">Room<Input name="room" placeholder="Optional" /></label>
        <label className="text-sm font-medium">Effective From<Input name="effectiveFrom" type="date" required /></label>
        <div className="flex items-end md:col-span-2 xl:col-span-3"><Button type="submit" disabled={pending} className="w-full sm:w-auto">{pending ? "Saving…" : "Add Batch Schedule"}</Button></div>
      </form>{feedback && <p role="status" className="mt-4 rounded-xl border bg-muted/30 px-4 py-3 text-sm">{feedback}</p>}</CardContent>
    </Card>

    <Card>
      <CardHeader><CardTitle>Weekly Batch Schedule</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 md:grid-cols-3">
          <label className="relative"><Search className="absolute left-3 top-3 size-4 text-muted-foreground"/><Input className="pl-9" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search batch, subject or room"/><span className="sr-only">Search schedules</span></label>
          <select className="h-10 rounded-xl border bg-card px-3 text-sm" value={batchFilter} onChange={(event) => setBatchFilter(event.target.value)}><option value="">All Batches</option>{options.batches.map((batch) => <option key={batch.id} value={batch.id}>{batch.label}</option>)}</select>
          <select className="h-10 rounded-xl border bg-card px-3 text-sm" value={dayFilter} onChange={(event) => setDayFilter(event.target.value)}><option value="">All Days</option>{days.map((day, index) => <option key={day} value={index + 1}>{day}</option>)}</select>
        </div>
        {visibleSchedules.length === 0 ? <p className="py-10 text-center text-muted-foreground">No schedules match these filters.</p> : <div className="grid gap-3 lg:grid-cols-2">{visibleSchedules.map((schedule) => <div key={schedule.id} className="rounded-2xl border bg-card p-4">
          <div className="flex items-start justify-between gap-3"><div><p className="font-semibold">{schedule.batchName}</p><p className="mt-1 text-sm text-muted-foreground">{schedule.subjectName ?? schedule.scheduleType.replaceAll("_", " ")}</p></div><Badge variant={schedule.isActive ? "default" : "secondary"}>{schedule.isActive ? "Active" : "Inactive"}</Badge></div>
          <div className="mt-4 grid grid-cols-2 gap-3 text-sm"><div><p className="text-xs text-muted-foreground">Weekly</p><p className="font-medium">{days[schedule.dayOfWeek - 1]}</p></div><div><p className="text-xs text-muted-foreground">Time</p><p className="font-medium">{schedule.startTime.slice(0,5)}–{schedule.endTime.slice(0,5)}</p></div><div><p className="text-xs text-muted-foreground">Effective from</p><p className="font-medium">{schedule.effectiveFrom}</p></div><div><p className="text-xs text-muted-foreground">Room</p><p className="font-medium">{schedule.room || "—"}</p></div></div>
          {schedule.isActive && <div className="mt-4 border-t pt-3"><Button type="button" size="sm" variant="outline" disabled={pending} onClick={() => deactivate(schedule.id)}>Deactivate</Button></div>}
        </div>)}</div>}
      </CardContent>
    </Card>
  </div>;
}
