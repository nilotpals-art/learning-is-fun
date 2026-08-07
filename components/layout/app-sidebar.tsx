"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, GraduationCap } from "lucide-react";

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

  return (
    <aside className="flex h-full min-h-0 flex-col bg-sidebar text-sidebar-foreground">
      <div className="flex h-16 items-center gap-3 border-b border-sidebar-border px-4">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-sidebar-primary text-sidebar-primary-foreground">
          <GraduationCap className="size-5" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="truncate font-semibold">{instituteName}</p>
          <p className="text-xs text-sidebar-foreground/60">ERP Portal</p>
        </div>
      </div>

      <nav aria-label="Primary navigation" className="min-h-0 flex-1 overflow-y-auto p-3">
        <ul className="space-y-1">
          {items.map((item) => {
            if (item.title === "Logout") {
              return (
                <li key={item.title} className="pt-2">
                  <LogoutButton
                    label="Logout"
                    variant="ghost"
                    className="w-full justify-start rounded-xl px-3 text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  />
                </li>
              );
            }

            if (item.children.length > 0) {
              return (
                <li key={item.title} className="pt-2">
                  <div className="flex items-center gap-3 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-sidebar-foreground/50">
                    <NavigationIcon name={item.icon} className="size-4" />
                    <span className="flex-1">{item.title}</span>
                    <ChevronRight className="size-3.5" aria-hidden="true" />
                  </div>
                  <ul className="space-y-1">
                    {item.children.map((child) => (
                      <li key={child.href}>
                        <NavigationLink
                          item={child}
                          pathname={pathname}
                          nested
                          onNavigate={onNavigate}
                        />
                      </li>
                    ))}
                  </ul>
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
