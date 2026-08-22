"use client";

import { Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { deletePlannerEventFromHistoryAction } from "@/features/learning-planner/actions/delete-actions";
import type { ScheduleChange } from "@/features/learning-planner/types/learning-planner";

export function HistoryList({ changes }: { changes: ScheduleChange[] }) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [pending, start] = useTransition();
  if (!changes.length) return <Card><CardContent className="p-8 text-center text-muted-foreground">No Schedule changes have been recorded.</CardContent></Card>;
  return <div className="space-y-3">{feedback ? <p className="text-sm" role="status">{feedback}</p> : null}{changes.map((change) => <Card key={change.id}><CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-start sm:justify-between"><div><p className="font-semibold">{change.eventTitle}</p><p className="text-sm text-muted-foreground">{change.reason ?? "No reason provided"}</p><p className="mt-1 text-xs text-muted-foreground">Changed by {change.changedByName} · {new Date(change.changedAt).toLocaleString()}</p></div><div className="flex items-center gap-2"><Badge>{change.changeType}</Badge><Button type="button" size="sm" variant="destructive" disabled={pending} onClick={() => { if (!window.confirm(`Delete ${change.eventTitle} everywhere? This removes the event and its Planner history.`)) return; setPendingId(change.scheduleEventId); start(async () => { const result = await deletePlannerEventFromHistoryAction(change.scheduleEventId); setFeedback(result.message); setPendingId(null); if (result.status === "success") router.refresh(); }); }}><Trash2 />{pendingId === change.scheduleEventId ? "Deleting…" : "Delete Event"}</Button></div></CardContent></Card>)}</div>;
}
