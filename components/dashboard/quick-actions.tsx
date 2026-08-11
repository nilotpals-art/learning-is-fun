import Link from "next/link";
import {
  BarChart3,
  CalendarCheck,
  CalendarDays,
  CircleDollarSign,
  GraduationCap,
  LibraryBig,
  NotebookPen,
  Sparkles,
} from "lucide-react";

import { DashboardSection } from "@/components/dashboard/dashboard-section";
import type { DashboardQuickAction } from "@/features/dashboard/types/dashboard";

const actions: readonly DashboardQuickAction[] = [
  { title: "Manage Students", description: "Admissions and Student profiles", href: "/students", icon: GraduationCap },
  { title: "Take Attendance", description: "Record today’s Batch attendance", href: "/attendance", icon: CalendarCheck },
  { title: "Attendance Reports", description: "Review institute Attendance", href: "/attendance/reports", icon: BarChart3 },
  { title: "Planner Calendar", description: "View classes and events", href: "/learning-planner/calendar", icon: CalendarDays },
  { title: "Class Schedules", description: "Manage recurring schedules", href: "/learning-planner/schedules", icon: NotebookPen },
  { title: "Generate Questions", description: "Create answer-backed Practice", href: "/practice-work/question-bank/generate", icon: Sparkles },
  { title: "Practice Sets", description: "Build and publish Practice Sets", href: "/practice-work/sets", icon: LibraryBig },
  { title: "Collect Fees", description: "Post payments and issue receipts", href: "/fees/collect", icon: CircleDollarSign },
];

export function QuickActions() {
  return (
    <DashboardSection title="Quick Actions" description="Working Administrator workflows" className="border-blue-100 bg-gradient-to-br from-card to-blue-50/55 dark:border-blue-950 dark:to-blue-950/15" contentClassName="grid gap-3 sm:grid-cols-2">
      {actions.map((action) => {
        const Icon = action.icon;
        return <Link key={action.href} href={action.href} className="group flex min-h-18 items-center gap-3 rounded-2xl border bg-background/80 p-3 transition-[background-color,box-shadow,transform] duration-200 motion-reduce:transition-none hover:-translate-y-0.5 hover:bg-background hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:hover:translate-y-0"><span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground group-hover:text-foreground"><Icon className="size-4" aria-hidden="true" /></span><span className="min-w-0"><span className="block text-sm font-medium">{action.title}</span><span className="block text-xs text-muted-foreground">{action.description}</span></span></Link>;
      })}
    </DashboardSection>
  );
}
