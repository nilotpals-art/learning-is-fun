import { Badge } from "@/components/ui/badge";
import type { AttendanceStatus } from "@/features/attendance/types/attendance";
import { cn } from "@/lib/utils";

const classes: Record<AttendanceStatus, string> = {
  Present: "border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200",
  Absent: "border-rose-300 bg-rose-50 text-rose-800 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-200",
  Late: "border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200",
  Leave: "border-blue-300 bg-blue-50 text-blue-800 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-200",
};

export function AttendanceStatusBadge({ status, className }: { status: AttendanceStatus; className?: string }) {
  return <Badge variant="outline" className={cn(classes[status], className)}>{status}</Badge>;
}
