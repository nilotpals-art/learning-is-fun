"use client";

import { Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { deleteForthcomingPlannerEventAction } from "@/features/learning-planner/actions/delete-actions";
import type { ScheduleEvent } from "@/features/learning-planner/types/learning-planner";

export function UpcomingEventDeletePanel({ events }: { events: ScheduleEvent[] }) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const today = new Date().toISOString().slice(0, 10);
  const deletable = events.filter((event) => !event.isProjected && event.eventDate >= today);

  if (!deletable.length) return null;

  return (
    <Card>
      <CardHeader><CardTitle>Forthcoming Event Actions</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">Delete a future event here. If it is a cancelled or rescheduled recurring class, the normal class occurrence is restored automatically.</p>
        {feedback ? <p className="text-sm" role="status">{feedback}</p> : null}
        <div className="space-y-2">
          {deletable.map((event) => (
            <div key={event.id} className="flex flex-col gap-3 rounded-2xl border p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-semibold">{event.title}</p>
                <p className="text-sm text-muted-foreground">{event.eventDate}{event.startTime ? ` · ${event.startTime}` : ""} · {event.scheduleType.replaceAll("_", " ")} · {event.status}</p>
              </div>
              <Button
                type="button"
                variant="destructive"
                disabled={pending}
                onClick={() => {
                  if (!window.confirm(`Delete ${event.title} on ${event.eventDate}?`)) return;
                  setPendingId(event.id);
                  start(async () => {
                    const result = await deleteForthcomingPlannerEventAction(event.id);
                    setFeedback(result.message);
                    setPendingId(null);
                    if (result.status === "success") router.refresh();
                  });
                }}
              >
                <Trash2 /> {pendingId === event.id ? "Deleting…" : "Delete"}
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
