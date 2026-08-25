"use client";

import { MoreHorizontal, Plus } from "lucide-react";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  cancelScheduleEventAction,
  completeScheduleEventAction,
  createScheduleEventAction,
  persistRecurringOccurrenceExceptionAction,
  rescheduleScheduleEventAction,
  schedulePendingReplacementAction,
} from "@/features/learning-planner/actions/event-actions";
import { EXPLICIT_CALENDAR_EVENT_TYPES, type EventOverlapConflict, type PlannerOptions, type ScheduleEvent, type ScheduleType } from "@/features/learning-planner/types/learning-planner";
import { buildMenuItems, defaultWhatsapp, effectiveEventStatus, eventLabel, eventStatusTone, labels } from "@/features/learning-planner/lib/event-lifecycle";

const select = "h-10 w-full rounded-xl border bg-card px-3";

function EventDialog({ open, onOpenChange, options, relatedEvent }: { open: boolean; onOpenChange: (open: boolean) => void; options: PlannerOptions; relatedEvent: ScheduleEvent | null }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [type, setType] = useState<ScheduleType>("extra_class");
  const [batchId, setBatchId] = useState(relatedEvent?.batchId ?? "");
  const [academicYearId, setAcademicYearId] = useState(relatedEvent?.academicYearId ?? options.academicYears.find((year) => year.isCurrent)?.id ?? options.academicYears[0]?.id ?? "");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [conflicts, setConflicts] = useState<EventOverlapConflict[]>([]);
  const batch = options.batches.find((item) => item.id === batchId);
  const subjectVisible = ["extra_class", "mock_test", "exam"].includes(type);

  const submit = (form: FormData) => start(async () => {
    setFeedback(null);
    const selectedBatch = options.batches.find((item) => item.id === batchId);
    const result = await createScheduleEventAction({
      branchId: selectedBatch?.branchId ?? undefined,
      academicYearId,
      batchId: type === "holiday" ? undefined : batchId,
      subjectId: subjectVisible ? form.get("subjectId") : undefined,
      classScheduleId: relatedEvent?.classScheduleId ?? undefined,
      relatedEventId: relatedEvent?.isProjected ? undefined : relatedEvent?.id,
      eventDate: form.get("eventDate"),
      startTime: form.get("startTime"),
      endTime: form.get("endTime"),
      scheduleType: type,
      title: form.get("title"),
      description: form.get("description"),
      notificationRequired: true,
      whatsappRequested: form.get("whatsappRequested") === "on",
      approveOverlap: form.get("approveOverlap") === "on",
      overlapReason: form.get("overlapReason"),
    });
    const fieldMessage = result.status === "error" ? Object.values(result.fieldErrors ?? {}).flatMap((messages) => messages ?? [])[0] : undefined;
    setFeedback(fieldMessage ?? result.message);
    setConflicts(result.status === "conflict" ? result.conflicts : []);
    if (result.status === "success") { onOpenChange(false); router.refresh(); }
  });

  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-3xl">
      <DialogHeader>
        <DialogTitle>{relatedEvent ? "Create Extra Class" : "Add Calendar Event"}</DialogTitle>
        <DialogDescription>Select the event, batch and date. Start and end time may be left blank for all-day or time-to-be-confirmed events.</DialogDescription>
      </DialogHeader>
      <form id="event-form" action={submit} className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-1 text-sm">Event Type
          <select className={select} value={type} onChange={(event) => setType(event.target.value as ScheduleType)} disabled={Boolean(relatedEvent)}>
            {EXPLICIT_CALENDAR_EVENT_TYPES.map((value) => <option key={value} value={value}>{labels[value]}</option>)}
          </select>
        </label>

        <label className="grid gap-1 text-sm">Academic Year
          <select name="academicYearId" className={select} required value={academicYearId} onChange={(event) => setAcademicYearId(event.target.value)}>
            {options.academicYears.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
          </select>
          <span className="text-xs text-muted-foreground">Current academic year is selected by default.</span>
        </label>

        {type !== "holiday" && <div className="grid gap-2 sm:col-span-2">
          <span className="text-sm font-medium">Batch</span>
          <div className="grid max-h-56 gap-2 overflow-y-auto rounded-xl border p-3 sm:grid-cols-2">
            {options.batches.map((item) => {
              const selected = batchId === item.id;
              return <label key={item.id} className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition ${selected ? "border-primary bg-primary/5 ring-1 ring-primary" : "hover:bg-muted/50"}`}>
                <input className="mt-1" type="radio" name="batchId" value={item.id} checked={selected} onChange={() => setBatchId(item.id)} required />
                <span><span className="block font-medium">{item.label}</span>{item.subjectName ? <span className="text-xs text-muted-foreground">{item.subjectName}</span> : null}</span>
              </label>;
            })}
          </div>
          {!options.batches.length ? <span className="text-xs text-destructive">No active batches are available.</span> : null}
        </div>}

        {subjectVisible && <label className="grid gap-1 text-sm">Subject (optional)
          <select name="subjectId" className={select} defaultValue={batch?.subjectId ?? ""} key={batchId}>
            <option value="">General / Not specified</option>
            {options.subjects.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
          </select>
        </label>}

        <label className="grid gap-1 text-sm sm:col-span-2">Title
          <Input name="title" required defaultValue={relatedEvent ? `EXTRA CLASS - ${relatedEvent.title}` : ""} />
        </label>
        <label className="grid gap-1 text-sm">Date<Input name="eventDate" type="date" required /></label>
        {type !== "holiday" && <>
          <label className="grid gap-1 text-sm">Start Time (optional)<Input name="startTime" type="time" /></label>
          <label className="grid gap-1 text-sm">End Time (optional)<Input name="endTime" type="time" /></label>
        </>}
        <label className="grid gap-1 text-sm sm:col-span-2">Notes / reason (optional)<Input name="description" /></label>
        <label className="flex items-center gap-2 rounded-xl border p-3 text-sm sm:col-span-2">
          <input name="whatsappRequested" type="checkbox" defaultChecked={relatedEvent ? true : defaultWhatsapp(type)} key={type} />Send WhatsApp Notification
        </label>
        {feedback ? <p role="status" className="text-sm sm:col-span-2">{feedback}</p> : null}
        {conflicts.length > 0 && <div className="space-y-3 rounded-xl border border-amber-400 bg-amber-50 p-4 text-sm text-amber-950 sm:col-span-2">
          <p className="font-semibold">Cross-Batch overlap requires approval</p>
          {conflicts.map((conflict) => <p key={`${conflict.kind}-${conflict.batchId}-${conflict.classScheduleId ?? conflict.eventId}`}>{conflict.batchName} · {conflict.date} · {conflict.startTime}–{conflict.endTime}</p>)}
          <label className="grid gap-1">Audit reason<Input name="overlapReason" required minLength={3} /></label>
          <label className="flex items-center gap-2"><input name="approveOverlap" type="checkbox" required />I confirm this cross-Batch overlap.</label>
        </div>}
      </form>
      <DialogFooter><Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button><Button type="submit" form="event-form" disabled={pending}>{pending ? "Saving…" : "Save Event"}</Button></DialogFooter>
    </DialogContent>
  </Dialog>;
}

function CancelDialog({ event, onClose }: { event: ScheduleEvent; onClose: () => void }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [feedback, setFeedback] = useState<string | null>(null);
  const [cancelType, setCancelType] = useState<"final" | "reschedule_later">("final");
  const canRescheduleLater = event.scheduleType === "regular_class";
  const isRescheduleLater = canRescheduleLater && cancelType === "reschedule_later";
  const submit = (form: FormData) => start(async () => {
    const result = event.isProjected
      ? await persistRecurringOccurrenceExceptionAction({ classScheduleId: event.classScheduleId, occurrenceDate: event.sourceOccurrenceDate, action: "cancel", reason: form.get("reason"), reschedulePending: isRescheduleLater, whatsappRequested: form.get("whatsappRequested") === "on" })
      : await cancelScheduleEventAction({ eventId: event.id, reason: form.get("reason"), reschedulePending: isRescheduleLater, whatsappRequested: form.get("whatsappRequested") === "on" });
    setFeedback(result.message); if (result.status === "success") { onClose(); router.refresh(); }
  });
  return <Dialog open onOpenChange={(open) => !open && onClose()}><DialogContent><DialogHeader><DialogTitle>Cancel Class</DialogTitle><DialogDescription>{event.title} · {event.eventDate} {event.startTime}</DialogDescription></DialogHeader>
    <form id="cancel-form" action={submit} className="space-y-4">
      <div className="space-y-2"><p className="text-sm font-medium">Cancellation type</p>
        <label className="flex items-center gap-2 text-sm"><input type="radio" name="cancelType" value="final" checked={cancelType === "final"} onChange={() => setCancelType("final")} />Cancel Final — permanently cancelled, no reschedule</label>
        {canRescheduleLater ? <label className="flex items-center gap-2 text-sm"><input type="radio" name="cancelType" value="reschedule_later" checked={cancelType === "reschedule_later"} onChange={() => setCancelType("reschedule_later")} />Reschedule Later — new date/time to be confirmed</label> : null}
      </div>
      <label className="grid gap-1 text-sm">Reason<Input name="reason" required minLength={3} /></label>
      <label className="flex gap-2 text-sm"><input name="whatsappRequested" type="checkbox" defaultChecked />Send WhatsApp Notification</label>
      {feedback ? <p role="status" className="text-sm">{feedback}</p> : null}
    </form>
    <DialogFooter><Button type="button" variant="outline" onClick={onClose}>Close</Button><Button type="submit" form="cancel-form" variant="destructive" disabled={pending}>{pending ? "Saving…" : isRescheduleLater ? "Reschedule Later" : "Cancel Final"}</Button></DialogFooter>
  </DialogContent></Dialog>;
}

function RescheduleDialog({ event, onClose, kind }: { event: ScheduleEvent; onClose: () => void; kind: "reschedule" | "replacement" }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [feedback, setFeedback] = useState<string | null>(null);
  const [conflicts, setConflicts] = useState<EventOverlapConflict[]>([]);
  const submit = (form: FormData) => start(async () => {
    const overlap = { approveOverlap: form.get("approveOverlap") === "on", overlapReason: form.get("overlapReason") };
    const whatsappRequested = form.get("whatsappRequested") === "on";
    const result = event.isProjected
      ? await persistRecurringOccurrenceExceptionAction({ classScheduleId: event.classScheduleId, occurrenceDate: event.sourceOccurrenceDate, action: "reschedule", reason: form.get("reason"), whatsappRequested, newDate: form.get("newDate"), newStartTime: form.get("newStartTime"), newEndTime: form.get("newEndTime"), ...overlap })
      : kind === "replacement"
        ? await schedulePendingReplacementAction({ eventId: event.id, newDate: form.get("newDate"), newStartTime: form.get("newStartTime"), newEndTime: form.get("newEndTime"), reason: form.get("reason"), whatsappRequested, ...overlap })
        : await rescheduleScheduleEventAction({ eventId: event.id, newDate: form.get("newDate"), newStartTime: form.get("newStartTime"), newEndTime: form.get("newEndTime"), reason: form.get("reason"), whatsappRequested, ...overlap });
    setFeedback(result.message); setConflicts(result.status === "conflict" ? result.conflicts : []); if (result.status === "success") { onClose(); router.refresh(); }
  });
  return <Dialog open onOpenChange={(open) => !open && onClose()}><DialogContent><DialogHeader><DialogTitle>{kind === "replacement" ? "Schedule New Date/Time" : "Reschedule Class"}</DialogTitle><DialogDescription>{event.title} · {event.eventDate} {event.startTime}</DialogDescription></DialogHeader>
    <form id="reschedule-form" action={submit} className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3"><label className="grid gap-1 text-sm">New Date<Input name="newDate" type="date" required /></label><label className="grid gap-1 text-sm">Start<Input name="newStartTime" type="time" required /></label><label className="grid gap-1 text-sm">End<Input name="newEndTime" type="time" required /></label></div>
      <label className="grid gap-1 text-sm">Reason<Input name="reason" required minLength={3} /></label>
      <label className="flex gap-2 text-sm"><input name="whatsappRequested" type="checkbox" defaultChecked />Send WhatsApp Notification</label>
      {feedback ? <p role="status" className="text-sm">{feedback}</p> : null}
      {conflicts.length > 0 ? <div className="space-y-3 rounded-xl border border-amber-400 bg-amber-50 p-4 text-sm text-amber-950"><p className="font-semibold">Cross-Batch overlap requires approval</p>{conflicts.map((conflict) => <p key={`${conflict.kind}-${conflict.batchId}-${conflict.classScheduleId ?? conflict.eventId}`}>{conflict.batchName} · {conflict.date} · {conflict.startTime}–{conflict.endTime}</p>)}<label className="grid gap-1">Audit reason<Input name="overlapReason" required minLength={3} /></label><label className="flex items-center gap-2"><input name="approveOverlap" type="checkbox" required />I confirm this cross-Batch overlap.</label></div> : null}
    </form>
    <DialogFooter><Button type="button" variant="outline" onClick={onClose}>Close</Button><Button type="submit" form="reschedule-form" disabled={pending}>{pending ? "Saving…" : "Confirm"}</Button></DialogFooter>
  </DialogContent></Dialog>;
}

export function EventManager({ events, options }: { events: ScheduleEvent[]; options: PlannerOptions }) {
  const router = useRouter();
  const [, start] = useTransition();
  const [createOpen, setCreateOpen] = useState(false);
  const [related, setRelated] = useState<ScheduleEvent | null>(null);
  const [cancelEvent, setCancelEvent] = useState<ScheduleEvent | null>(null);
  const [rescheduleDialog, setRescheduleDialog] = useState<{ event: ScheduleEvent; kind: "reschedule" | "replacement" } | null>(null);

  return <div className="space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl font-semibold">Calendar Events</h2><p className="text-sm text-muted-foreground">Create actual occurrences and manage lifecycle exceptions.</p></div><Button type="button" onClick={() => { setRelated(null); setCreateOpen(true); }}><Plus />Add Event</Button></div>
    {events.length === 0 ? <Card><CardContent className="p-8 text-center text-muted-foreground">No Schedule Events match this view.</CardContent></Card> : <div className="overflow-hidden rounded-xl border bg-card"><Table><TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Time</TableHead><TableHead>Type</TableHead><TableHead>Batch</TableHead><TableHead>Subject</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader><TableBody>
      {events.map((event) => {
        const status = effectiveEventStatus(event);
        const rowTone = event.status === "cancelled" ? "bg-red-50/70" : status === "completed" ? "bg-emerald-50/70" : status === "rescheduled" ? "bg-amber-50/70" : event.scheduleType === "extra_class" ? "bg-sky-50/70" : "bg-slate-50/40";
        const menuItems = buildMenuItems(event, status, () => setCancelEvent(event), (kind) => setRescheduleDialog({ event, kind }), () => { setRelated(event); setCreateOpen(true); }, (path: string) => router.push(path), () => start(async () => { await completeScheduleEventAction({ eventId: event.id }); router.refresh(); }));
        return <TableRow key={event.id} className={rowTone}><TableCell>{event.eventDate}</TableCell><TableCell>{event.startTime ?? "All day / TBD"}{event.endTime ? `–${event.endTime}` : ""}</TableCell><TableCell><div className="font-medium">{event.title}</div><div className="text-xs text-muted-foreground">{labels[event.scheduleType]}</div></TableCell><TableCell>{event.batchName ?? "Institute-wide"}</TableCell><TableCell>{event.subjectName ?? "General / Combined Assessment"}</TableCell><TableCell><Badge className={eventStatusTone(status)} variant="secondary">{eventLabel(event)}</Badge></TableCell><TableCell className="text-right"><DropdownMenu><DropdownMenuTrigger render={<Button type="button" variant="ghost" size="icon-sm" aria-label={`Actions for ${event.title}`} />}><MoreHorizontal /></DropdownMenuTrigger><DropdownMenuContent align="end">{menuItems.length ? menuItems.map((item) => <DropdownMenuItem key={item.label} variant={item.danger ? "destructive" : undefined} onClick={item.onSelect}>{item.label}</DropdownMenuItem>) : <DropdownMenuItem disabled>No actions</DropdownMenuItem>}</DropdownMenuContent></DropdownMenu></TableCell></TableRow>;
      })}
    </TableBody></Table></div>}
    <EventDialog key={`${related?.id ?? "new"}-${createOpen ? "open" : "closed"}`} open={createOpen} onOpenChange={setCreateOpen} options={options} relatedEvent={related} />
    {cancelEvent ? <CancelDialog event={cancelEvent} onClose={() => setCancelEvent(null)} /> : null}
    {rescheduleDialog ? <RescheduleDialog event={rescheduleDialog.event} kind={rescheduleDialog.kind} onClose={() => setRescheduleDialog(null)} /> : null}
  </div>;
}
