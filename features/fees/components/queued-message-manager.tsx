"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { deleteQueuedFeeMessagesForStudent } from "@/features/fees/actions/delete-queued-messages";
import type { FeeMessage } from "@/features/fees/types/fees";

const selectClass = "h-10 w-full rounded-xl border border-input bg-background px-3 text-sm";

export function QueuedMessageManager({ messages }: { messages: FeeMessage[] }) {
  const queuedMessages = messages.filter((message) => message.status === "queued" && Boolean(message.studentId));
  const studentOptions: Array<{ id: string; name: string }> = [];
  const seen = new Set<string>();

  for (const message of queuedMessages) {
    if (!seen.has(message.studentId)) {
      seen.add(message.studentId);
      studentOptions.push({ id: message.studentId, name: message.studentName });
    }
  }
  studentOptions.sort((a, b) => a.name.localeCompare(b.name));

  const [studentId, setStudentId] = useState("");
  const [pending, startTransition] = useTransition();
  const [resultMessage, setResultMessage] = useState<string | null>(null);
  const selectedCount = studentId
    ? queuedMessages.filter((message) => message.studentId === studentId).length
    : 0;

  function handleDelete() {
    if (!studentId || selectedCount === 0) return;
    const studentName = studentOptions.find((student) => student.id === studentId)?.name ?? "this student";
    if (!window.confirm(`Delete ${selectedCount} queued WhatsApp message${selectedCount === 1 ? "" : "s"} for ${studentName}?`)) return;

    startTransition(async () => {
      const result = await deleteQueuedFeeMessagesForStudent(studentId);
      setResultMessage(result.message);
      if (result.status === "success") window.location.reload();
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Delete Queued Messages</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Select a student and delete only messages that are still queued. Sent, delivered and failed message history is retained.
        </p>
        <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
          <label className="grid gap-2 text-sm">
            Student
            <select
              className={selectClass}
              value={studentId}
              onChange={(event) => {
                setStudentId(event.target.value);
                setResultMessage(null);
              }}
              disabled={pending || studentOptions.length === 0}
            >
              <option value="">{studentOptions.length === 0 ? "No students with queued messages" : "Select student"}</option>
              {studentOptions.map((student) => (
                <option key={student.id} value={student.id}>{student.name}</option>
              ))}
            </select>
          </label>
          <Button
            type="button"
            variant="destructive"
            disabled={pending || !studentId || selectedCount === 0}
            onClick={handleDelete}
          >
            {pending ? "Deleting…" : `Delete Queued (${selectedCount})`}
          </Button>
        </div>
        {resultMessage ? <p className="text-sm text-muted-foreground">{resultMessage}</p> : null}
      </CardContent>
    </Card>
  );
}
