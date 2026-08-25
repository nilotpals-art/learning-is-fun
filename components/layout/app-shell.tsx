import type { ReactNode } from "react";

import { AppHeader } from "@/components/layout/app-header";
import { AppSidebar } from "@/components/layout/app-sidebar";
import type { PortalHolidayTheme } from "@/features/learning-planner/services/portal-holiday-theme-service";
import { isAdministratorRole } from "@/lib/auth/roles";
import type { NavigationItem } from "@/lib/navigation";
import { cn } from "@/lib/utils";

interface AppShellProps {
  children: ReactNode;
  instituteName: string;
  navigationItems: readonly NavigationItem[];
  holidayTheme?: PortalHolidayTheme | null;
  user: { name: string; email: string | null; role: string };
}

export function AppShell({ children, instituteName, navigationItems, holidayTheme, user }: AppShellProps) {
  const parentTheme = user.role === "Parent";
  const adminTheme = isAdministratorRole(user.role);
  const defaultShellTheme = parentTheme
    ? "bg-[radial-gradient(circle_at_top_right,_#ccfbf1_0,_transparent_28%),radial-gradient(circle_at_top_left,_#dbeafe_0,_transparent_32%),linear-gradient(to_bottom_right,_#f8fafc,_#eff6ff_52%,_#f0fdfa)]"
    : adminTheme
      ? "bg-[radial-gradient(circle_at_top_right,_#dbeafe_0,_transparent_24%),linear-gradient(to_bottom_right,_#f8fafc,_#f1f5f9_52%,_#ecfeff)]"
      : "bg-background";

  return <div className={cn("min-h-screen lg:grid lg:grid-cols-[17rem_minmax(0,1fr)]", holidayTheme?.shellClassName ?? defaultShellTheme)}>
    <div className="fixed inset-y-0 left-0 z-40 hidden w-68 lg:block"><AppSidebar instituteName={instituteName} items={navigationItems} parentTheme={parentTheme} adminTheme={adminTheme} /></div>
    <div className="min-w-0 lg:col-start-2">
      <AppHeader instituteName={instituteName} navigationItems={navigationItems} user={user} parentTheme={parentTheme} adminTheme={adminTheme} />
      {holidayTheme ? <div className="mx-auto w-full max-w-[100rem] px-4 pt-4 sm:px-6 sm:pt-6 lg:px-8 xl:px-10">
        <div role="status" className={cn("flex flex-col gap-3 rounded-2xl border px-4 py-3 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:px-5", holidayTheme.bannerClassName)}>
          <div className="flex min-w-0 items-center gap-3">
            <span aria-hidden="true" className="text-2xl sm:text-3xl">{holidayTheme.emoji}</span>
            <div className="min-w-0">
              <p className="font-semibold">{holidayTheme.greeting}</p>
              <p className="mt-0.5 text-xs opacity-75 sm:text-sm">A festive touch from Learning Is Fun</p>
            </div>
          </div>
          <span className={cn("w-fit shrink-0 rounded-full px-3 py-1 text-xs font-semibold", holidayTheme.badgeClassName)}>{holidayTheme.holidayName}</span>
        </div>
      </div> : null}
      <main className={cn("mx-auto w-full max-w-[100rem] p-4 sm:p-6 lg:p-8 xl:p-10", holidayTheme && "pt-5 sm:pt-6")}>{children}</main>
      <footer className={cn("border-t px-4 py-4 text-center text-xs sm:px-6", parentTheme ? "border-slate-200/80 bg-white/55 text-slate-500 backdrop-blur" : adminTheme ? "border-slate-200 bg-white/60 text-slate-500 backdrop-blur" : "text-muted-foreground")}>Learning Is Fun ERP</footer>
    </div>
  </div>;
}
