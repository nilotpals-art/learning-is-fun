"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { generateScheduleEventsAction } from "@/features/learning-planner/actions/schedule-actions";
import type { ClassSchedule, PlannerOption, ScheduleGenerationResult } from "@/features/learning-planner/types/learning-planner";

function iso(date: Date): string { return date.toISOString().slice(0, 10); }

export function ScheduleGenerationDialog({ batches, schedules }: { batches: PlannerOption[]; schedules: ClassSchedule[] }) {
  const today = new Date(); const defaultTo = new Date(today); defaultTo.setUTCDate(defaultTo.getUTCDate() + 29);
  const router = useRouter(); const [open, setOpen] = useState(false); const [pending, start] = useTransition();
  const [result, setResult] = useState<ScheduleGenerationResult | null>(null); const [error, setError] = useState<string | null>(null);
  const submit = (form: FormData) => start(async () => {
    setError(null); setResult(null);
    const response = await generateScheduleEventsAction({ fromDate: form.get("fromDate"), toDate: form.get("toDate"), batchId: form.get("batchId"), classScheduleId: form.get("classScheduleId") });
    if (response.status === "error") setError(response.message); else { setResult(response.result); router.refresh(); }
  });
  return <><Button onClick={() => setOpen(true)}>Generate Calendar Events</Button><Dialog open={open} onOpenChange={setOpen}><DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl"><DialogHeader><DialogTitle>Generate Calendar Events</DialogTitle><DialogDescription>Generate missing recurring occurrences only. Existing, rescheduled, cancelled, and completed Events will not be replaced.</DialogDescription></DialogHeader><form action={submit} className="space-y-5"><div className="grid gap-4 sm:grid-cols-2"><label className="text-sm font-medium">From Date<Input name="fromDate" type="date" required defaultValue={iso(today)} /></label><label className="text-sm font-medium">To Date<Input name="toDate" type="date" required defaultValue={iso(defaultTo)} /></label><label className="text-sm font-medium">Batch filter<select name="batchId" className="mt-1 h-10 w-full rounded-xl border bg-card px-3"><option value="">All Batches</option>{batches.map((batch) => <option key={batch.id} value={batch.id}>{batch.label}</option>)}</select></label><label className="text-sm font-medium">Recurring Schedule filter<select name="classScheduleId" className="mt-1 h-10 w-full rounded-xl border bg-card px-3"><option value="">All Schedules</option>{schedules.map((schedule) => <option key={schedule.id} value={schedule.id}>{schedule.batchName} · {schedule.subjectName ?? schedule.scheduleType.replaceAll("_", " ")} · {schedule.startTime}</option>)}</select></label></div>{error && <p className="rounded-xl bg-destructive/10 p-3 text-sm text-destructive" role="alert">{error}</p>}{result && <div className="space-y-3 rounded-2xl border bg-muted/30 p-4" role="status"><div className="grid grid-cols-3 gap-3 text-center"><div><strong className="block text-2xl">{result.generatedCount}</strong><span className="text-xs text-muted-foreground">Generated</span></div><div><strong className="block text-2xl">{result.existingCount}</strong><span className="text-xs text-muted-foreground">Existing</span></div><div><strong className="block text-2xl">{result.conflictCount}</strong><span className="text-xs text-muted-foreground">Conflicts</span></div></div>{result.conflicts.length > 0 && <ul className="space-y-2 border-t pt-3">{result.conflicts.map((conflict) => <li key={`${conflict.classScheduleId}-${conflict.date}`} className="text-sm"><span className="font-medium">{conflict.date} · {conflict.startTime}–{conflict.endTime}</span> — {conflict.type === "holiday" ? "Holiday suppression" : `${conflict.type} conflict`}. <Link className="underline" href={`/learning-planner/events?event=${conflict.conflictingEventId}`}>View Event</Link></li>)}</ul>}</div>}<DialogFooter><Button type="button" variant="outline" onClick={() => setOpen(false)}>Close</Button><Button disabled={pending}>{pending ? "Generating…" : "Generate Events"}</Button></DialogFooter></form></DialogContent></Dialog></>;
}
