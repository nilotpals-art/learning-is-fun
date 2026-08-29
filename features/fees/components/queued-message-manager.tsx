"use client";

import { useMemo, useState, useTransition } from "react";
import { Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Toaster, toast } from "@/components/ui/toast";
import { deleteQueuedFeeMessagesForStudent } from "@/features/fees/actions/delete-queued-messages";
import type { FeeMessage } from "@/features/fees/types/fees";

const selectClass = "h-10 w-full rounded-xl border border-input bg-background px-3 text-sm";

export function QueuedMessageManager({ messages }: { messages: FeeMessage[] }) {
  const [pending, start] = useTransition();
  const queued = useMemo(() => messages.filter((message) => message.status === "queued"), [messages]);
  const students = useMemo(() => {
    const map = new Map<string, string>();
    for (const message of queued) map.set(message.studentId, message.studentName);
    return [...map.entries()].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [queued]);
  const [studentId, setStudentId] = useState(students[0]?.id ?? "");
  const selectedCount = queued.filter((message) => message.studentId === studentId).length;

  function removeQueued() {
    if (!studentId) return;
    const student = students.find((item) => item.id === studentId);
    const confirmed = window.confirm(`Delete ${selectedCount} queued WhatsApp message${selectedCount === 1 ? "" : "s"} for ${student?.name ?? "this student"}? Sent and delivered messages will not be deleted.`);
    if (!confirmed) return;
    start(async () => {
      const result = await deleteQueuedFeeMessagesForStudent(studentId);
      toast.add({ title: result.status === "success" ? "Queued messages" : "Unable to delete", description: result.message, type: result.status === "success" ? "success" : "error" });
      if (result.status === "success") window.location.reload();
    });
  }

  return <>
    <Card>
      <CardHeader><CardTitle>Delete Queued Messages</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">Select a student and remove only messages that are still queued. Sent, delivered and failed history is kept.</p>
        <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
          <label className="grid gap-2 text-sm">Student
            <select className={selectClass} value={studentId} onChange={(event) => setStudentId(event.target.value)} disabled={pending || students.length === 0}>
              {students.length === 0 ? <option value="">No students with queued messages</option> : null}
              {students.map((student) => <option key={student.id} value={student.id}>{student.name}</option>)}
            </select>
          </label>
          <Button type="button" variant="destructive" disabled={pending || !studentId || selectedCount === 0} onClick={removeQueued}><Trash2 />{pending ? "Deleting…" : `Delete Queued (${selectedCount})`}</Button>
        </div>
      </CardContent>
    </Card>
    <Toaster />
  </>;
}
