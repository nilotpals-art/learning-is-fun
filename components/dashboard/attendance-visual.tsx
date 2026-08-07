import { CalendarCheck2 } from "lucide-react";

import { DashboardSection } from "@/components/dashboard/dashboard-section";
import { Badge } from "@/components/ui/badge";

export function AttendanceVisual() {
  return (
    <DashboardSection
      title="Attendance Summary"
      description="Today’s attendance overview"
      action={<Badge variant="secondary">Placeholder</Badge>}
    >
      <div className="flex items-center gap-5 rounded-2xl bg-emerald-50/70 p-5 dark:bg-emerald-950/20">
        <div className="relative flex size-20 shrink-0 items-center justify-center rounded-full bg-background shadow-sm ring-8 ring-emerald-100 dark:ring-emerald-900/50">
          <span className="text-xl font-semibold" aria-label="Attendance data unavailable">
            —
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-sm font-medium">
            <CalendarCheck2 className="size-4 text-emerald-600" aria-hidden="true" />
            Attendance data unavailable
          </div>
          <div
            className="mt-3 h-2 overflow-hidden rounded-full bg-emerald-100 dark:bg-emerald-950"
            role="progressbar"
            aria-label="Attendance percentage unavailable"
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div className="h-full w-0 rounded-full bg-emerald-500" />
          </div>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">
            A live percentage will appear when the Attendance module is available.
          </p>
        </div>
      </div>
    </DashboardSection>
  );
}
