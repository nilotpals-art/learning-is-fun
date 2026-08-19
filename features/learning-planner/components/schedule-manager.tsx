"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Toaster, toast } from "@/components/ui/toast";
import { persistRecurringOccurrenceExceptionAction } from "@/features/learning-planner/actions/event-actions";
import type { ClassSchedule } from "@/features/learning-planner/types/learning-planner";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

function formatDateLabel(value: string): string {
  return new Date(`${value}T00:00:00.000Z`).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function occurrenceDatesFor(schedule: ClassSchedule): string[] {
  const effectiveEnd = schedule.effectiveTo ?? schedule.academicYearEndDate;
  const start = new Date(`${schedule.effectiveFrom}T00:00:00.000Z`);
  const end = new Date(`${effectiveEnd}T00:00:00.000Z`);
  const values: string[] = [];

  for (let cursor = new Date(start); cursor <= end; cursor.setUTCDate(cursor.getUTCDate() + 1)) {
    const dateValue = cursor.toISOString().slice(0, 10);
    const dayOfWeek = cursor.getUTCDay() || 7;
    if (dayOfWeek === schedule.dayOfWeek) {
      values.push(dateValue);
    }
  }

  return values;
}

export function ScheduleManager({ schedules }: { schedules: ClassSchedule[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [pendingDialog, setPendingDialog] = useState<{
    schedule: ClassSchedule;
    action: "cancel" | "reschedule";
  } | null>(null);
  const [occurrenceDate, setOccurrenceDate] = useState("");
  const [reason, setReason] = useState("");
  const [newDate, setNewDate] = useState("");
  const [newStartTime, setNewStartTime] = useState("");
  const [newEndTime, setNewEndTime] = useState("");
  const [cancelType, setCancelType] = useState<"final" | "reschedule_later">("final");
  const [whatsappRequested, setWhatsappRequested] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const openDialog = (schedule: ClassSchedule, action: "cancel" | "reschedule") => {
    const dates = occurrenceDatesFor(schedule);
    setPendingDialog({ schedule, action });
    setOccurrenceDate(dates[0] ?? "");
    setReason("");
    setNewDate("");
    setNewStartTime("");
    setNewEndTime("");
    setCancelType("final");
    setWhatsappRequested(true);
    setError(null);
  };

  const closeDialog = () => {
    setPendingDialog(null);
    setOccurrenceDate("");
    setReason("");
    setNewDate("");
    setNewStartTime("");
    setNewEndTime("");
    setCancelType("final");
    setWhatsappRequested(true);
    setError(null);
  };

  const submitOccurrence = () => {
    if (!pendingDialog) return;
    const dates = occurrenceDatesFor(pendingDialog.schedule);
    const selectedOccurrence = occurrenceDate || dates[0] || "";

    if (!selectedOccurrence) {
      setError("Select an occurrence date for this recurring schedule.");
      return;
    }

    if (pendingDialog.action === "reschedule" && (!newDate || !newStartTime || !newEndTime)) {
      setError("Choose a new date and time for the occurrence reschedule.");
      return;
    }

    if (reason.trim().length < 3) {
      setError("Enter a brief reason for the occurrence change.");
      return;
    }

    start(async () => {
      const isRescheduleLater = pendingDialog.action === "cancel" && cancelType === "reschedule_later";
      const result = await persistRecurringOccurrenceExceptionAction({
        classScheduleId: pendingDialog.schedule.id,
        occurrenceDate: selectedOccurrence,
        action: pendingDialog.action,
        reason,
        newDate: pendingDialog.action === "reschedule" ? newDate : undefined,
        newStartTime: pendingDialog.action === "reschedule" ? newStartTime : undefined,
        newEndTime: pendingDialog.action === "reschedule" ? newEndTime : undefined,
        reschedulePending: isRescheduleLater,
        whatsappRequested,
      });

      if (result.status === "success") {
        toast.add({ title: "Success", description: result.message, type: "success" });
        closeDialog();
        router.refresh();
        return;
      }

      setError(result.message);
      toast.add({ title: "Unable to update occurrence", description: result.message, type: "error" });
    });
  };

  return (
    <>
      <Toaster />
      <Card>
        <CardHeader className="flex-row items-start justify-between gap-4">
          <div>
            <CardTitle>Recurring Timetable Audit</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Timetables are created and changed with their subject-specific Batch so academic context and overlap approvals remain authoritative.
            </p>
          </div>
          <Button nativeButton={false} render={<Link href="/masters/batches" />}>
            Manage Batch Timetables
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {schedules.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">No recurring Class Schedules yet.</p>
          ) : (
            schedules.map((schedule) => {
              const validDates = occurrenceDatesFor(schedule);
              return (
                <article key={schedule.id} className="flex flex-col gap-3 rounded-2xl border p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-semibold">
                      {DAYS[schedule.dayOfWeek - 1]} · {schedule.startTime}–{schedule.endTime}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {schedule.batchName} · {schedule.subjectName ?? "Subject not set"}
                    </p>
                    <p className="text-xs text-muted-foreground">Effective from {schedule.effectiveFrom} {schedule.effectiveTo ? `to ${schedule.effectiveTo}` : ""}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{validDates.length} valid occurrence dates</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant={schedule.isActive ? "secondary" : "outline"}>{schedule.isActive ? "Active" : "Inactive"}</Badge>
                    <DropdownMenu>
                      <DropdownMenuTrigger render={<Button type="button" variant="ghost" size="icon-sm" aria-label={`Actions for ${schedule.batchName}`} /> }>
                        <span aria-hidden="true">⋮</span>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openDialog(schedule, "cancel")}>
                          Cancel Class
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => openDialog(schedule, "reschedule")}>
                          Reschedule Class
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </article>
              );
            })
          )}
        </CardContent>
      </Card>

      {pendingDialog && (
        <Dialog open onOpenChange={(open) => !open && closeDialog()}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {pendingDialog.action === "cancel" ? "Cancel recurring occurrence" : "Reschedule recurring occurrence"}
              </DialogTitle>
              <DialogDescription>
                {pendingDialog.schedule.batchName} · {DAYS[pendingDialog.schedule.dayOfWeek - 1]} · {pendingDialog.schedule.startTime}–{pendingDialog.schedule.endTime}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <label className="grid gap-1 text-sm">
                Occurrence date
                <select
                  value={occurrenceDate}
                  onChange={(event) => setOccurrenceDate(event.target.value)}
                  className="h-10 w-full rounded-xl border bg-card px-3 text-sm"
                >
                  {occurrenceDatesFor(pendingDialog.schedule).length === 0 ? (
                    <option value="">No valid dates available</option>
                  ) : (
                    occurrenceDatesFor(pendingDialog.schedule).map((date) => (
                      <option key={date} value={date}>
                        {formatDateLabel(date)}
                      </option>
                    ))
                  )}
                </select>
              </label>

              <label className="grid gap-1 text-sm">
                Reason
                <Input value={reason} onChange={(event) => setReason(event.target.value)} minLength={3} placeholder="Brief administrative reason" />
              </label>

              {pendingDialog.action === "cancel" && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Cancellation type</p>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name="cancelType"
                      checked={cancelType === "final"}
                      onChange={() => setCancelType("final")}
                    />
                    Cancel Final — permanently cancelled, no reschedule
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name="cancelType"
                      checked={cancelType === "reschedule_later"}
                      onChange={() => setCancelType("reschedule_later")}
                    />
                    Reschedule Later — new date/time to be confirmed
                  </label>
                </div>
              )}

              {pendingDialog.action === "reschedule" && (
                <div className="grid gap-3 sm:grid-cols-3">
                  <label className="grid gap-1 text-sm">
                    New Date
                    <Input type="date" value={newDate} onChange={(event) => setNewDate(event.target.value)} />
                  </label>
                  <label className="grid gap-1 text-sm">
                    Start
                    <Input type="time" value={newStartTime} onChange={(event) => setNewStartTime(event.target.value)} />
                  </label>
                  <label className="grid gap-1 text-sm">
                    End
                    <Input type="time" value={newEndTime} onChange={(event) => setNewEndTime(event.target.value)} />
                  </label>
                </div>
              )}

              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={whatsappRequested}
                  onChange={(event) => setWhatsappRequested(event.target.checked)}
                />
                Send WhatsApp Notification
              </label>

              {error && <p className="text-sm text-destructive">{error}</p>}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeDialog} disabled={pending}>
                Cancel
              </Button>
              <Button type="button" onClick={submitOccurrence} disabled={pending}>
                {pending ? "Saving…" : pendingDialog.action === "cancel" ? "Cancel Class" : "Reschedule Class"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
