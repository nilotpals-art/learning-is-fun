"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  cancelScheduleEventAction,
  completeScheduleEventAction,
  createScheduleEventAction,
  persistRecurringOccurrenceExceptionAction,
  rescheduleScheduleEventAction,
  schedulePendingReplacementAction,
} from "@/features/learning-planner/actions/event-actions";
import {
  CALENDAR_EVENT_TYPES,
  EXPLICIT_CALENDAR_EVENT_TYPES,
  type EventOverlapConflict,
  type PlannerOptions,
  type ScheduleEvent,
  type ScheduleType,
} from "@/features/learning-planner/types/learning-planner";

const labels: Record<(typeof CALENDAR_EVENT_TYPES)[number], string> = {
  regular_class: "Regular Class",
  extra_class: "Extra Class",
  mock_test: "Mock Test",
  exam: "Exam",
  parent_meeting: "Parent Meeting",
  holiday: "Holiday",
};

const select = "h-10 w-full rounded-xl border bg-card px-3";

function defaultWhatsapp(type: ScheduleType) {
  return ["extra_class", "mock_test", "exam", "parent_meeting", "holiday"].includes(type);
}

function effectiveEventStatus(event: ScheduleEvent) {
  if (event.status !== "scheduled") return event.status;
  if (!event.endTime) return event.status;
  const endAt = new Date(`${event.eventDate}T${event.endTime}:00`);
  if (Number.isNaN(endAt.getTime())) return event.status;
  return endAt.getTime() < Date.now() ? "completed" : event.status;
}

function eventStatusTone(status: ScheduleEvent["status"]) {
  if (status === "cancelled") return "bg-red-50 text-red-700 ring-1 ring-red-200";
  if (status === "completed") return "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200";
  if (status === "rescheduled") return "bg-amber-50 text-amber-700 ring-1 ring-amber-200";
  return "bg-sky-50 text-sky-700 ring-1 ring-sky-200";
}

function eventLabel(event: ScheduleEvent) {
  if (event.reschedulePending) return "Cancelled · Reschedule Pending";
  if (event.scheduleType === "extra_class") return "Extra Class";
  const status = effectiveEventStatus(event);
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function EventDialog({
  open,
  onOpenChange,
  options,
  relatedEvent,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  options: PlannerOptions;
  relatedEvent: ScheduleEvent | null;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [type, setType] = useState<ScheduleType>(
    relatedEvent ? "extra_class" : "extra_class",
  );
  const [batchId, setBatchId] = useState(relatedEvent?.batchId ?? "");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [conflicts, setConflicts] = useState<EventOverlapConflict[]>([]);

  const batch = options.batches.find((item) => item.id === batchId);
  const subjectVisible = ["extra_class", "mock_test", "exam"].includes(type);

  const submit = (form: FormData) =>
    start(async () => {
      setFeedback(null);
      const selectedBatch = options.batches.find(
        (item) => item.id === String(form.get("batchId")),
      );
      const result = await createScheduleEventAction({
        branchId: selectedBatch?.branchId ?? form.get("branchId") ?? undefined,
        academicYearId:
          type === "regular_class"
            ? selectedBatch?.academicYearId
            : form.get("academicYearId"),
        batchId: form.get("batchId"),
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
      const fieldMessage =
        result.status === "error"
          ? Object.values(result.fieldErrors ?? {}).flatMap((messages) => messages ?? [])[0]
          : undefined;
      setFeedback(fieldMessage ?? result.message);
      setConflicts(result.status === "conflict" ? result.conflicts : []);
      if (result.status === "success") {
        onOpenChange(false);
        router.refresh();
      }
    });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {relatedEvent ? "Create Extra Class" : "Add Calendar Event"}
          </DialogTitle>
          <DialogDescription>
            Only fields relevant to the selected event type are shown.
          </DialogDescription>
        </DialogHeader>
        <form id="event-form" action={submit} className="grid gap-4 sm:grid-cols-2">
          <label className="grid gap-1 text-sm">
            Event Type
            <select
              className={select}
              value={type}
              onChange={(event) => setType(event.target.value as ScheduleType)}
              disabled={Boolean(relatedEvent)}
            >
              {EXPLICIT_CALENDAR_EVENT_TYPES.map((value) => (
                <option key={value} value={value}>
                  {labels[value]}
                </option>
              ))}
            </select>
          </label>
          {type !== "holiday" && (
            <label className="grid gap-1 text-sm">
              Batch
              <select
                name="batchId"
                className={select}
                required
                value={batchId}
                onChange={(event) => setBatchId(event.target.value)}
              >
                <option value="">Select Batch</option>
                {options.batches.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                    {item.subjectName ? ` · ${item.subjectName}` : ""}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label className="grid gap-1 text-sm">
            Academic Year
            <select name="academicYearId" className={select} required>
              <option value="">Select</option>
              {options.academicYears.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
          {subjectVisible && (
            <label className="grid gap-1 text-sm">
              Subject (optional)
              <select name="subjectId" className={select}>
                <option value="">General / Not specified</option>
                {options.subjects.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label className="grid gap-1 text-sm sm:col-span-2">
            Title
            <Input
              name="title"
              required
              defaultValue={
                relatedEvent
                  ? `EXTRA CLASS - ${relatedEvent.title}`
                  : type === "regular_class" && batch
                    ? `${batch.subjectName ?? "CLASS"} - ${batch.label}`
                    : ""
              }
            />
          </label>
          <label className="grid gap-1 text-sm">
            Date
            <Input name="eventDate" type="date" required />
          </label>
          {type !== "holiday" && (
            <>
              <label className="grid gap-1 text-sm">
                Start Time
                <Input name="startTime" type="time" required />
              </label>
              <label className="grid gap-1 text-sm">
                End Time
                <Input name="endTime" type="time" required />
              </label>
            </>
          )}
          <label className="grid gap-1 text-sm sm:col-span-2">
            Notes / reason (optional)
            <Input name="description" />
          </label>
          <label className="flex items-center gap-2 rounded-xl border p-3 text-sm sm:col-span-2">
            <input
              name="whatsappRequested"
              type="checkbox"
              defaultChecked={relatedEvent ? true : defaultWhatsapp(type)}
              key={type}
            />
            Send WhatsApp Notification
          </label>
          {feedback && (
            <p role="status" className="text-sm sm:col-span-2">
              {feedback}
            </p>
          )}
          {conflicts.length > 0 && (
            <div className="space-y-3 rounded-xl border border-amber-400 bg-amber-50 p-4 text-sm text-amber-950 sm:col-span-2">
              <p className="font-semibold">Cross-Batch overlap requires approval</p>
              {conflicts.map((conflict) => (
                <p key={`${conflict.kind}-${conflict.batchId}-${conflict.classScheduleId ?? conflict.eventId}`}>
                  {conflict.batchName} · {conflict.date} · {conflict.startTime}–{conflict.endTime}
                </p>
              ))}
              <label className="grid gap-1">
                Audit reason
                <Input name="overlapReason" required minLength={3} />
              </label>
              <label className="flex items-center gap-2">
                <input name="approveOverlap" type="checkbox" required />
                I confirm this cross-Batch overlap.
              </label>
            </div>
          )}
        </form>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" form="event-form" disabled={pending}>
            {pending ? "Saving…" : "Save Event"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function LifecycleDialog({
  event,
  kind,
  onClose,
}: {
  event: ScheduleEvent;
  kind: "cancel" | "reschedule" | "replacement";
  onClose: () => void;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [feedback, setFeedback] = useState<string | null>(null);
  const [conflicts, setConflicts] = useState<EventOverlapConflict[]>([]);

  const submit = (form: FormData) =>
    start(async () => {
      const overlap = {
        approveOverlap: form.get("approveOverlap") === "on",
        overlapReason: form.get("overlapReason"),
      };
      const result = event.isProjected
        ? await persistRecurringOccurrenceExceptionAction({
            classScheduleId: event.classScheduleId,
            occurrenceDate: event.sourceOccurrenceDate,
            action: kind === "cancel" ? "cancel" : "reschedule",
            reason: form.get("reason"),
            reschedulePending: form.get("reschedulePending") === "on",
            whatsappRequested: form.get("whatsappRequested") === "on",
            newDate: kind === "cancel" ? undefined : form.get("newDate"),
            newStartTime: kind === "cancel" ? undefined : form.get("newStartTime"),
            newEndTime: kind === "cancel" ? undefined : form.get("newEndTime"),
            ...overlap,
          })
        : kind === "cancel"
          ? await cancelScheduleEventAction({
              eventId: event.id,
              reason: form.get("reason"),
              reschedulePending: form.get("reschedulePending") === "on",
              whatsappRequested: form.get("whatsappRequested") === "on",
            })
          : kind === "replacement"
            ? await schedulePendingReplacementAction({
                eventId: event.id,
                newDate: form.get("newDate"),
                newStartTime: form.get("newStartTime"),
                newEndTime: form.get("newEndTime"),
                reason: form.get("reason"),
                ...overlap,
              })
            : await rescheduleScheduleEventAction({
                eventId: event.id,
                newDate: form.get("newDate"),
                newStartTime: form.get("newStartTime"),
                newEndTime: form.get("newEndTime"),
                reason: form.get("reason"),
                ...overlap,
              });
      setFeedback(result.message);
      setConflicts(result.status === "conflict" ? result.conflicts : []);
      if (result.status === "success") {
        onClose();
        router.refresh();
      }
    });

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {kind === "cancel"
              ? "Cancel Class"
              : kind === "replacement"
                ? "Schedule Replacement"
                : "Reschedule Class"}
          </DialogTitle>
          <DialogDescription>
            {event.title} · {event.eventDate} {event.startTime}
          </DialogDescription>
        </DialogHeader>
        <form id="lifecycle-form" action={submit} className="space-y-4">
          {kind !== "cancel" && (
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="grid gap-1 text-sm">
                New Date
                <Input name="newDate" type="date" required />
              </label>
              <label className="grid gap-1 text-sm">
                Start
                <Input name="newStartTime" type="time" required />
              </label>
              <label className="grid gap-1 text-sm">
                End
                <Input name="newEndTime" type="time" required />
              </label>
            </div>
          )}
          <label className="grid gap-1 text-sm">
            Reason
            <Input name="reason" required minLength={3} />
          </label>
          {kind === "cancel" && (
            <>
              <label className="flex gap-2 text-sm">
                <input name="reschedulePending" type="checkbox" />
                Rescheduled class details will be updated later
              </label>
              <label className="flex gap-2 text-sm">
                <input name="whatsappRequested" type="checkbox" defaultChecked />
                Send WhatsApp Notification
              </label>
            </>
          )}
          {feedback && (
            <p role="status" className="text-sm">
              {feedback}
            </p>
          )}
          {conflicts.length > 0 && (
            <div className="space-y-3 rounded-xl border border-amber-400 bg-amber-50 p-4 text-sm text-amber-950">
              <p className="font-semibold">Cross-Batch overlap requires approval</p>
              {conflicts.map((conflict) => (
                <p key={`${conflict.kind}-${conflict.batchId}-${conflict.classScheduleId ?? conflict.eventId}`}>
                  {conflict.batchName} · {conflict.date} · {conflict.startTime}–{conflict.endTime}
                </p>
              ))}
              <label className="grid gap-1">
                Audit reason
                <Input name="overlapReason" required minLength={3} />
              </label>
              <label className="flex items-center gap-2">
                <input name="approveOverlap" type="checkbox" required />
                I confirm this cross-Batch overlap.
              </label>
            </div>
          )}
        </form>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button
            type="submit"
            form="lifecycle-form"
            variant={kind === "cancel" ? "destructive" : "default"}
            disabled={pending}
          >
            {pending ? "Saving…" : "Confirm"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function EventManager({
  events,
  options,
}: {
  events: ScheduleEvent[];
  options: PlannerOptions;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [createOpen, setCreateOpen] = useState(false);
  const [related, setRelated] = useState<ScheduleEvent | null>(null);
  const [lifecycle, setLifecycle] = useState<{
    event: ScheduleEvent;
    kind: "cancel" | "reschedule" | "replacement";
  } | null>(null);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">Calendar Events</h2>
          <p className="text-sm text-muted-foreground">
            Create actual occurrences and manage lifecycle exceptions.
          </p>
        </div>
        <Button
          type="button"
          onClick={() => {
            setRelated(null);
            setCreateOpen(true);
          }}
        >
          <Plus />
          Add Event
        </Button>
      </div>
      {events.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            No Schedule Events match this view.
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-hidden rounded-xl border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Event</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Batch / Subject</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {events.map((event) => {
                const status = effectiveEventStatus(event);
                const isCompleted = status === "completed";
                const rowTone =
                  event.status === "cancelled"
                    ? "bg-red-50/70"
                    : status === "completed"
                      ? "bg-emerald-50/70"
                      : status === "rescheduled"
                        ? "bg-amber-50/70"
                        : event.scheduleType === "extra_class"
                          ? "bg-sky-50/70"
                          : "bg-slate-50/40";
                return (
                  <TableRow key={event.id} className={rowTone}>
                    <TableCell>
                      <div className="font-medium">{event.title}</div>
                      <div className="text-xs text-muted-foreground">{labels[event.scheduleType as keyof typeof labels] ?? event.scheduleType.replaceAll("_", " ")}</div>
                    </TableCell>
                    <TableCell>
                      <div>{event.eventDate}</div>
                      <div className="text-xs text-muted-foreground">{event.startTime ?? "All day"}{event.endTime ? `–${event.endTime}` : ""}</div>
                    </TableCell>
                    <TableCell>
                      <div>{event.batchName ?? "Institute-wide"}</div>
                      <div className="text-xs text-muted-foreground">{event.subjectName ?? "General / Combined Assessment"}</div>
                    </TableCell>
                    <TableCell>
                      <Badge className={eventStatusTone(status)} variant="secondary">
                        {eventLabel(event)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex flex-wrap justify-end gap-2">
                        {event.scheduleType === "regular_class" && (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setRelated(event);
                              setCreateOpen(true);
                            }}
                          >
                            Extra Class
                          </Button>
                        )}
                        {!event.isProjected && event.reschedulePending && (
                          <Button type="button" size="sm" onClick={() => setLifecycle({ event, kind: "replacement" })}>
                            Reschedule
                          </Button>
                        )}
                        {!isCompleted && event.status === "scheduled" && (
                          <>
                            <Button type="button" size="sm" variant="outline" onClick={() => setLifecycle({ event, kind: "reschedule" })}>
                              Reschedule
                            </Button>
                            {!event.isProjected && (
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  start(async () => {
                                    await completeScheduleEventAction({ eventId: event.id });
                                    router.refresh();
                                  })
                                }
                                disabled={pending}
                              >
                                Complete
                              </Button>
                            )}
                            <Button type="button" size="sm" variant="destructive" onClick={() => setLifecycle({ event, kind: "cancel" })}>
                              Cancel
                            </Button>
                          </>
                        )}
                        {event.isProjected ? (
                          <Badge variant="outline">Derived</Badge>
                        ) : (
                          <Button
                            nativeButton={false}
                            render={<Link href={`/learning-planner/history?event=${event.id}`} />}
                            type="button"
                            size="sm"
                            variant="ghost"
                          >
                            History
                          </Button>
                        )}
                        {event.scheduleType === "exam" && (
                          <Button
                            nativeButton={false}
                            render={<Link href={`/learning-planner/exam-results/${event.id}`} />}
                            type="button"
                            size="sm"
                            variant="ghost"
                          >
                            Results
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
      <EventDialog
        key={`${related?.id ?? "new"}-${createOpen ? "open" : "closed"}`}
        open={createOpen}
        onOpenChange={setCreateOpen}
        options={options}
        relatedEvent={related}
      />
      {lifecycle && (
        <LifecycleDialog
          event={lifecycle.event}
          kind={lifecycle.kind}
          onClose={() => setLifecycle(null)}
        />
      )}
    </div>
  );
}
