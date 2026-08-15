import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ClassSchedule } from "@/features/learning-planner/types/learning-planner";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export function ScheduleManager({ schedules }: { schedules: ClassSchedule[] }) {
  return (
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
          schedules.map((schedule) => (
            <article key={schedule.id} className="flex flex-col gap-3 rounded-2xl border p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-semibold">
                  {DAYS[schedule.dayOfWeek - 1]} · {schedule.startTime}–{schedule.endTime}
                </p>
                <p className="text-sm text-muted-foreground">
                  {schedule.batchName} · {schedule.subjectName ?? "Subject not set"}
                </p>
                <p className="text-xs text-muted-foreground">Effective from {schedule.effectiveFrom}</p>
              </div>
              <Badge variant={schedule.isActive ? "secondary" : "outline"}>{schedule.isActive ? "Active" : "Inactive"}</Badge>
            </article>
          ))
        )}
      </CardContent>
    </Card>
  );
}
