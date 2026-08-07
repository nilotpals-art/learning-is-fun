import Link from "next/link";
import {
  BookPlus,
  CalendarCheck,
  GraduationCap,
  IndianRupee,
  Megaphone,
  NotebookPen,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { DashboardSection } from "@/components/dashboard/dashboard-section";
import type { DashboardQuickAction } from "@/features/dashboard/types/dashboard";

const actions: readonly DashboardQuickAction[] = [
  {
    title: "Add Student",
    description: "Create a student profile",
    href: "/coming-soon/students",
    icon: GraduationCap,
  },
  {
    title: "Mark Attendance",
    description: "Record today’s attendance",
    href: "/coming-soon/attendance",
    icon: CalendarCheck,
  },
  {
    title: "Create Homework",
    description: "Assign work to a class",
    href: "/coming-soon/homework",
    icon: BookPlus,
  },
  {
    title: "Schedule Exam",
    description: "Plan an upcoming examination",
    href: "/coming-soon/examinations",
    icon: NotebookPen,
  },
  {
    title: "Collect Fees",
    description: "Record a fee payment",
    href: "/coming-soon/fees",
    icon: IndianRupee,
  },
  {
    title: "Announcement",
    description: "Share an institute update",
    href: "/coming-soon/announcements",
    icon: Megaphone,
  },
];

export function QuickActions() {
  return (
    <DashboardSection
      title="Quick Actions"
      description="Frequently used ERP workflows"
      className="border-blue-100 bg-gradient-to-br from-card to-blue-50/55 dark:border-blue-950 dark:to-blue-950/15"
      contentClassName="grid gap-3 sm:grid-cols-2"
    >
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <Link
              key={action.title}
              href={action.href}
              className="group flex min-h-18 items-center gap-3 rounded-2xl border bg-background/80 p-3 transition-[background-color,box-shadow,transform] duration-200 motion-reduce:transition-none hover:-translate-y-0.5 hover:bg-background hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:hover:translate-y-0"
            >
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground group-hover:text-foreground">
                <Icon className="size-4" aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium">{action.title}</span>
                <span className="block truncate text-xs text-muted-foreground">
                  {action.description}
                </span>
              </span>
              <Badge variant="secondary" className="text-[0.625rem]">Soon</Badge>
            </Link>
          );
        })}
    </DashboardSection>
  );
}
