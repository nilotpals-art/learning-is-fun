"use client";

import type { LucideIcon } from "lucide-react";
import {
  Banknote,
  Bell,
  BookOpen,
  CalendarCheck,
  ChartNoAxesCombined,
  CircleDollarSign,
  ClipboardCheck,
  FileChartColumn,
  FileText,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Megaphone,
  NotebookTabs,
  School,
  Settings,
  Users,
  UserRound,
} from "lucide-react";

import type { NavigationIconName } from "@/lib/navigation";
import { cn } from "@/lib/utils";

const iconMap = {
  dashboard: LayoutDashboard,
  calendar: CalendarCheck,
  school: School,
  "graduation-cap": GraduationCap,
  users: Users,
  "user-round": UserRound,
  "book-open": BookOpen,
  academics: NotebookTabs,
  attendance: ClipboardCheck,
  homework: FileText,
  exams: NotebookTabs,
  marks: ChartNoAxesCombined,
  "report-card": FileChartColumn,
  finance: Banknote,
  fees: CircleDollarSign,
  communication: Bell,
  announcements: Megaphone,
  reports: FileChartColumn,
  settings: Settings,
  logout: LogOut,
} satisfies Record<NavigationIconName, LucideIcon>;

interface NavigationIconProps {
  name: NavigationIconName;
  className?: string;
}

export function NavigationIcon({ name, className }: NavigationIconProps) {
  const Icon = iconMap[name];
  return <Icon className={cn(className)} aria-hidden="true" />;
}
