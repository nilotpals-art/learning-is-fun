import {
  CalendarCheck,
  CircleDollarSign,
  ClipboardList,
  GraduationCap,
  NotebookTabs,
} from "lucide-react";

import { QuickActions } from "@/components/dashboard/quick-actions";
import { RecentActivity } from "@/components/dashboard/recent-activity";
import { StatCard } from "@/components/dashboard/stat-card";
import { AnnouncementHighlight } from "@/components/dashboard/announcement-highlight";
import { AttendanceVisual } from "@/components/dashboard/attendance-visual";
import { ModuleStatus } from "@/components/dashboard/module-status";
import { UpcomingPanel } from "@/components/dashboard/upcoming-panel";
import type { DashboardStat } from "@/features/dashboard/types/dashboard";

const stats: readonly DashboardStat[] = [
  {
    title: "Total Students",
    value: "—",
    description: "Available with the Students module",
    icon: GraduationCap,
    tone: "blue",
    status: "Waiting for student records",
  },
  {
    title: "Today’s Attendance",
    value: "—",
    description: "Attendance module currently in progress",
    icon: CalendarCheck,
    tone: "emerald",
    status: "Attendance workflow is being completed",
  },
  {
    title: "Practice Work",
    value: "—",
    description: "Available with the Practice Work module",
    icon: ClipboardList,
    tone: "amber",
    status: "Planned after Learning Planner",
  },
  {
    title: "Upcoming Exams",
    value: "—",
    description: "Available with the Examinations module",
    icon: NotebookTabs,
    tone: "violet",
    status: "Planned after Practice Work",
  },
  {
    title: "Pending Fees",
    value: "—",
    description: "Available with the Fees module",
    icon: CircleDollarSign,
    tone: "rose",
    status: "No fee data available",
  },
];

export function DashboardOverview() {
  return (
    <div className="space-y-6">
      <section aria-labelledby="dashboard-summary-heading">
        <h2 id="dashboard-summary-heading" className="sr-only">Dashboard summary</h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {stats.map((stat) => (
            <StatCard key={stat.title} {...stat} />
          ))}
        </div>
      </section>

      <ModuleStatus />

      <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]" aria-label="Dashboard actions and schedule">
        <QuickActions />
        <UpcomingPanel />
      </section>

      <section className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3" aria-label="Dashboard updates">
        <RecentActivity />
        <AttendanceVisual />
        <AnnouncementHighlight />
      </section>
    </div>
  );
}
