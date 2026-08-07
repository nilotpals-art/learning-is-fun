import type { LucideIcon } from "lucide-react";

export interface DashboardStat {
  title: string;
  value: string;
  description: string;
  icon: LucideIcon;
  tone: "blue" | "emerald" | "amber" | "violet" | "rose";
  status?: string;
}

export interface DashboardQuickAction {
  title: string;
  description: string;
  href: string;
  icon: LucideIcon;
}
