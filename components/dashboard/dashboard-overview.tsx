import {
  CalendarCheck,
  CircleDollarSign,
  GraduationCap,
  School,
  UserMinus,
  UserPlus,
} from "lucide-react";

import { QuickActions } from "@/components/dashboard/quick-actions";
import { RecentActivity } from "@/components/dashboard/recent-activity";
import { StatCard } from "@/components/dashboard/stat-card";
import { UpcomingPanel } from "@/components/dashboard/upcoming-panel";
import type {
  AdministratorDashboardData,
  DashboardStat,
} from "@/features/dashboard/types/dashboard";

export function DashboardOverview({ data }: { data: AdministratorDashboardData }) {
  const currency = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
  const stats: readonly DashboardStat[] = [
    {
      title: "Active Students",
      value: data.activeStudents.toString(),
      description: "Currently active Student profiles",
      icon: GraduationCap,
      tone: "blue",
      href: "/students",
      linkLabel: "Manage Students",
    },
    {
      title: "New Students Enrolled",
      value: data.newStudentsEnrolled.toString(),
      description: "Admissions recorded this month",
      icon: UserPlus,
      tone: "emerald",
      href: "/students",
      linkLabel: "View Students",
    },
    {
      title: "Students Left",
      value: data.studentsLeft.toString(),
      description: "Students currently marked Left",
      icon: UserMinus,
      tone: "rose",
      href: "/students",
      linkLabel: "View Students",
    },
    {
      title: "Attendance Today",
      value: data.attendanceToday.percentage === null ? "—" : `${data.attendanceToday.percentage}%`,
      description: data.attendanceToday.total ? `${data.attendanceToday.effectivePresent} of ${data.attendanceToday.total} effectively present` : "No Attendance recorded today",
      icon: CalendarCheck,
      tone: "emerald",
      href: "/attendance",
      linkLabel: "Open Attendance",
    },
    {
      title: "Classes Today",
      value: data.classesToday.toString(),
      description: "Scheduled classes from the Planner",
      icon: School,
      tone: "violet",
      href: "/learning-planner/calendar",
      linkLabel: "Open Calendar",
    },
    {
      title: "Outstanding Fees",
      value: currency.format(data.feeSummary.totalOutstanding),
      description: `${currency.format(data.feeSummary.collectionsToday)} collected today`,
      icon: CircleDollarSign,
      tone: "amber",
      href: "/fees",
      linkLabel: "Open Fees",
    },
  ];

  return (
    <div className="space-y-6">
      <section aria-labelledby="dashboard-summary-heading">
        <h2 id="dashboard-summary-heading" className="sr-only">Operational summary</h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
          {stats.map((stat) => <StatCard key={stat.title} {...stat} />)}
        </div>
      </section>
      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]" aria-label="Dashboard actions and upcoming events">
        <QuickActions />
        <UpcomingPanel events={data.upcomingEvents} />
      </section>
      <RecentActivity activities={data.recentActivity} />
    </div>
  );
}
