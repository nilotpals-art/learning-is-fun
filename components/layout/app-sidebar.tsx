"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { ChevronDown, ChevronRight, GraduationCap } from "lucide-react";

import { NavigationIcon } from "@/components/layout/navigation-icon";
import { Badge } from "@/components/ui/badge";
import { LogoutButton } from "@/features/auth/components/logout-button";
import {
  getComingSoonSlug,
  type NavigationItem,
} from "@/lib/navigation";
import { cn } from "@/lib/utils";

interface AppSidebarProps {
  instituteName: string;
  items: readonly NavigationItem[];
  onNavigate?: () => void;
}

function getDestination(item: NavigationItem): string {
  return item.enabled
    ? item.href
    : `/coming-soon/${getComingSoonSlug(item)}`;
}

function NavigationLink({
  item,
  pathname,
  nested = false,
  onNavigate,
}: {
  item: NavigationItem;
  pathname: string;
  nested?: boolean;
  onNavigate?: () => void;
}) {
  const destination = getDestination(item);
  const active =
    pathname === item.href ||
    (item.href !== "/dashboard" && pathname.startsWith(`${item.href}/`));

  return (
    <Link
      href={destination}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex min-h-10 items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring",
        nested && "ml-4 text-[0.8125rem]",
        active
          ? "bg-sidebar-primary text-sidebar-primary-foreground"
          : "text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
      )}
    >
      <NavigationIcon name={item.icon} className="size-4 shrink-0" />
      <span className="min-w-0 flex-1 truncate">{item.title}</span>
      {item.badge ? (
        <Badge variant="secondary" className="px-1.5 text-[0.625rem]">
          {item.badge}
        </Badge>
      ) : null}
    </Link>
  );
}

export function AppSidebar({
  instituteName,
  items,
  onNavigate,
}: AppSidebarProps) {
  const pathname = usePathname();
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  return (
    <aside className="flex h-full min-h-0 flex-col bg-gradient-to-b from-indigo-950 via-violet-950 to-slate-950 text-sidebar-foreground shadow-2xl shadow-indigo-950/20">
      <div className="flex min-h-20 items-center gap-3 border-b border-white/10 px-4 py-3">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-white/12 text-white shadow-inner ring-1 ring-white/15">
          <GraduationCap className="size-5" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-base font-extrabold tracking-tight">Learning Is Fun</p>
          <p className="truncate text-[0.6875rem] font-medium text-indigo-100/65">English Remedial Classes</p>
          <p className="truncate text-[0.625rem] text-indigo-100/45">{instituteName}</p>
        </div>
      </div>

      <nav aria-label="Primary navigation" className="min-h-0 flex-1 overflow-y-auto p-3">
        <ul className="space-y-1">
          {items.map((item) => {
            if (item.title === "Logout") {
              return (
                <li key={item.href} className="pt-2">
                  <LogoutButton
                    label="Logout"
                    variant="ghost"
                    className="w-full justify-start rounded-xl px-3 text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  />
                </li>
              );
            }

            if (item.children.length > 0) {
              const childActive = item.children.some(
                (child) => pathname === child.href || pathname.startsWith(`${child.href}/`)
              );
              const expanded = childActive || expandedGroups[item.title] === true;
              return (
                <li key={item.href} className="pt-2">
                  <button type="button" aria-expanded={expanded} onClick={() => setExpandedGroups((current) => ({ ...current, [item.title]: !expanded }))} className={cn("flex min-h-11 w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring", childActive ? "bg-white/10 text-white" : "text-indigo-100/75 hover:bg-white/8 hover:text-white")}>
                    <NavigationIcon name={item.icon} className="size-4.5" />
                    <span className="flex-1">{item.title}</span>
                    {expanded ? <ChevronDown className="size-4" aria-hidden="true" /> : <ChevronRight className="size-4" aria-hidden="true" />}
                  </button>
                  <div className={cn("grid transition-[grid-template-rows,opacity] duration-200 motion-reduce:transition-none", expanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0")}><ul className="min-h-0 space-y-1 overflow-hidden pt-1">{item.children.map((child) => <li key={child.href}><NavigationLink item={child} pathname={pathname} nested onNavigate={onNavigate} /></li>)}</ul></div>
                </li>
              );
            }

            return (
              <li key={item.href}>
                <NavigationLink
                  item={item}
                  pathname={pathname}
                  onNavigate={onNavigate}
                />
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}
