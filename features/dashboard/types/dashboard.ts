import type { LucideIcon } from "lucide-react";

export type DashboardTone = "blue" | "emerald" | "amber" | "violet" | "rose";

export interface DashboardStat {
  title: string;
  value: string;
  description?: string;
  icon: LucideIcon;
  tone?: DashboardTone;
  href?: string;
  linkLabel?: string;
}

export interface DashboardQuickAction {
  title: string;
  description: string;
  href: string;
  icon: LucideIcon;
}

export interface DashboardUpcomingEvent {
  id: string;
  title: string;
  eventDate: string;
  startTime: string | null;
  status: string;
  batchName: string | null;
}

export interface DashboardActivity {
  id: string;
  type: "student" | "attendance" | "planner" | "practice" | "fees";
  title: string;
  context: string;
  occurredAt: string;
  href: string;
}

export interface AdministratorDashboardData {
  activeStudents: number;
  newStudentsEnrolled: number;
  studentsLeft: number;
  attendanceToday: {
    total: number;
    effectivePresent: number;
    percentage: number | null;
  };
  classesToday: number;
  feeSummary: {
    totalOutstanding: number;
    collectionsToday: number;
  };
  upcomingEvents: DashboardUpcomingEvent[];
  recentActivity: DashboardActivity[];
}
