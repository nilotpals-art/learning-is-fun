"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { ChevronDown, ChevronRight, GraduationCap } from "lucide-react";

import { NavigationIcon } from "@/components/layout/navigation-icon";
import { Badge } from "@/components/ui/badge";
import { LogoutButton } from "@/features/auth/components/logout-button";
import type { NavigationItem } from "@/lib/navigation";
import { cn } from "@/lib/utils";

interface AppSidebarProps {
  instituteName: string;
  items: readonly NavigationItem[];
  onNavigate?: () => void;
  parentTheme?: boolean;
}

const exactMatchHrefs = new Set(["/dashboard", "/students", "/attendance", "/learning-planner", "/practice-work", "/student/dashboard", "/parent/dashboard"]);

function isItemActive(item: NavigationItem, pathname: string): boolean {
  return pathname === item.href || (!exactMatchHrefs.has(item.href) && pathname.startsWith(`${item.href}/`));
}

function NavigationLink({ item, pathname, nested = false, onNavigate, parentTheme = false }: { item: NavigationItem; pathname: string; nested?: boolean; onNavigate?: () => void; parentTheme?: boolean }) {
  const active = isItemActive(item, pathname);
  return (
    <Link href={item.href} onClick={onNavigate} aria-current={active ? "page" : undefined} className={cn(
      "flex min-h-10 items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring",
      nested && "ml-4 text-[0.8125rem]",
      parentTheme
        ? active ? "bg-white text-fuchsia-700 shadow-md shadow-fuchsia-950/10" : "text-white/90 hover:bg-white/15 hover:text-white"
        : active ? "bg-sidebar-primary text-sidebar-primary-foreground" : "text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
    )}>
      <NavigationIcon name={item.icon} className="size-4 shrink-0" />
      <span className="min-w-0 flex-1 truncate">{item.title}</span>
      {item.badge ? <Badge variant="secondary" className="px-1.5 text-[0.625rem]">{item.badge}</Badge> : null}
    </Link>
  );
}

export function AppSidebar({ instituteName, items, onNavigate, parentTheme = false }: AppSidebarProps) {
  const pathname = usePathname();
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  return (
    <aside className={cn(
      "flex h-full min-h-0 flex-col text-sidebar-foreground shadow-2xl",
      parentTheme
        ? "bg-gradient-to-b from-fuchsia-700 via-violet-700 to-indigo-800 shadow-violet-950/25"
        : "bg-gradient-to-b from-indigo-950 via-violet-950 to-slate-950 shadow-indigo-950/20"
    )}>
      <div className="flex min-h-24 items-center gap-3 border-b border-white/15 px-4 py-4">
        <span className={cn("flex size-12 shrink-0 items-center justify-center rounded-2xl text-white shadow-inner ring-1 ring-white/20", parentTheme ? "bg-gradient-to-br from-amber-300 to-rose-400" : "bg-white/12") }>
          <GraduationCap className="size-6" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className={cn("truncate font-black tracking-tight text-white", parentTheme ? "text-lg" : "text-base")}>Learning Is Fun!!!</p>
          <p className={cn("truncate text-[0.6875rem] font-semibold", parentTheme ? "text-amber-100" : "text-indigo-100/65")}>English Remedial Classes</p>
          <p className="truncate text-[0.625rem] text-white/55">{instituteName}</p>
        </div>
      </div>

      <nav aria-label="Primary navigation" className="min-h-0 flex-1 overflow-y-auto p-3">
        <ul className="space-y-1">
          {items.map((item) => {
            if (item.title === "Logout") return <li key={item.href} className="pt-2"><LogoutButton label="Logout" variant="ghost" className={cn("w-full justify-start rounded-xl px-3", parentTheme ? "text-white/90 hover:bg-white/15 hover:text-white" : "text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground")} /></li>;
            if (item.children.length > 0) {
              const childActive = item.children.some((child) => isItemActive(child, pathname));
              const expanded = childActive || expandedGroups[item.title] === true;
              return <li key={item.href} className="pt-2">
                <button type="button" aria-expanded={expanded} onClick={() => setExpandedGroups((current) => ({ ...current, [item.title]: !expanded }))} className={cn("flex min-h-11 w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm font-bold transition-colors", parentTheme ? childActive ? "bg-white/18 text-white" : "text-white/80 hover:bg-white/12 hover:text-white" : childActive ? "bg-white/10 text-white" : "text-indigo-100/75 hover:bg-white/8 hover:text-white")}>
                  <NavigationIcon name={item.icon} className="size-4.5" /><span className="flex-1">{item.title}</span>{expanded ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
                </button>
                <div className={cn("grid transition-[grid-template-rows,opacity] duration-200", expanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0")}><ul className="min-h-0 space-y-1 overflow-hidden pt-1">{item.children.map((child) => <li key={child.href}><NavigationLink item={child} pathname={pathname} nested onNavigate={onNavigate} parentTheme={parentTheme} /></li>)}</ul></div>
              </li>;
            }
            return <li key={item.href}><NavigationLink item={item} pathname={pathname} onNavigate={onNavigate} parentTheme={parentTheme} /></li>;
          })}
        </ul>
      </nav>
    </aside>
  );
}
