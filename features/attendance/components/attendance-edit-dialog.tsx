"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/toast";
import { editAttendance } from "@/features/attendance/actions/attendance-actions";
import { ATTENDANCE_STATUSES, type AttendanceRosterEntry, type AttendanceStatus } from "@/features/attendance/types/attendance";

function AttendanceEditForm({ entry, onClose, onSaved }: { entry: AttendanceRosterEntry; onClose: () => void; onSaved: () => void }) {
  const [status, setStatus] = useState<AttendanceStatus>(entry.status);
  const [remarks, setRemarks] = useState(entry.remarks);
  const [isPending, startTransition] = useTransition();
  function submit() {
    if (!entry.attendanceId) return;
    startTransition(async () => {
      const result = await editAttendance({ attendanceId: entry.attendanceId, status, remarks });
      if (result.status !== "success") { toast.add({ title: "Unable to update", description: result.message, type: "error" }); return; }
      toast.add({ title: "Attendance updated", description: result.message, type: "success" });
      onClose(); onSaved();
    });
  }
  return <Dialog open onOpenChange={(open) => !open && onClose()}><DialogContent><DialogHeader><DialogTitle>Edit Attendance</DialogTitle><DialogDescription>{entry.studentName} · {entry.admissionNumber}. Student, date, Batch and Assignment remain unchanged.</DialogDescription></DialogHeader><div className="space-y-5"><fieldset><legend className="mb-2 text-sm font-medium">Attendance</legend><div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{ATTENDANCE_STATUSES.map((item) => <Button key={item} type="button" variant={status === item ? "default" : "outline"} aria-pressed={status === item} onClick={() => setStatus(item)}>{item}</Button>)}</div></fieldset><div className="space-y-2"><label htmlFor="edit-attendance-remarks" className="text-sm font-medium">Remarks</label><Input id="edit-attendance-remarks" value={remarks} maxLength={250} onChange={(event) => setRemarks(event.target.value.toUpperCase())} placeholder="Optional remarks" /></div></div><DialogFooter><Button variant="outline" disabled={isPending} onClick={onClose}>Cancel</Button><Button disabled={isPending} onClick={submit}>{isPending ? "Saving…" : "Save Changes"}</Button></DialogFooter></DialogContent></Dialog>;
}

export function AttendanceEditDialog({ entry, onClose, onSaved }: { entry: AttendanceRosterEntry | null; onClose: () => void; onSaved: () => void }) {
  return entry?.attendanceId ? <AttendanceEditForm key={entry.attendanceId} entry={entry} onClose={onClose} onSaved={onSaved} /> : null;
}
