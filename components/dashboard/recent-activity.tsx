import Link from "next/link";
import { CalendarCheck, CircleDollarSign, Clock3, GraduationCap, NotebookPen, Sparkles } from "lucide-react";

import { DashboardSection } from "@/components/dashboard/dashboard-section";
import { EmptyState } from "@/components/dashboard/empty-state";
import type { DashboardActivity } from "@/features/dashboard/types/dashboard";

const icons = { student: GraduationCap, attendance: CalendarCheck, planner: NotebookPen, practice: Sparkles, fees: CircleDollarSign } as const;

export function RecentActivity({ activities }: { activities: readonly DashboardActivity[] }) {
  return (
    <DashboardSection title="Recent Activity" description="Latest verified records across implemented modules" contentClassName="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      {activities.length ? activities.map((activity) => {
        const Icon = icons[activity.type];
        return <Link key={activity.id} href={activity.href} className="rounded-2xl border bg-background/70 p-4 transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><div className="flex items-start gap-3"><span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-muted"><Icon className="size-4" aria-hidden="true" /></span><div className="min-w-0"><p className="font-semibold capitalize">{activity.title}</p><p className="mt-1 text-sm text-muted-foreground">{activity.context}</p><time className="mt-2 block text-xs text-muted-foreground" dateTime={activity.occurredAt}>{new Date(activity.occurredAt).toLocaleString("en-IN")}</time></div></div></Link>;
      }) : <div className="md:col-span-2 xl:col-span-4"><EmptyState icon={Clock3} title="No recent activity yet." description="New Student, Attendance, Planner, Practice, and Fee records will appear here." /></div>}
    </DashboardSection>
  );
}
