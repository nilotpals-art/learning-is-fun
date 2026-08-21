import type { ReactNode } from "react";

import { AppHeader } from "@/components/layout/app-header";
import { AppSidebar } from "@/components/layout/app-sidebar";
import type { NavigationItem } from "@/lib/navigation";
import { cn } from "@/lib/utils";

interface AppShellProps {
  children: ReactNode;
  instituteName: string;
  navigationItems: readonly NavigationItem[];
  user: {
    name: string;
    email: string | null;
    role: string;
  };
}

export function AppShell({ children, instituteName, navigationItems, user }: AppShellProps) {
  const parentTheme = user.role === "Parent";

  return (
    <div className={cn(
      "min-h-screen lg:grid lg:grid-cols-[17rem_minmax(0,1fr)]",
      parentTheme
        ? "bg-[radial-gradient(circle_at_top_left,_#fef3c7_0,_transparent_30%),radial-gradient(circle_at_top_right,_#dbeafe_0,_transparent_32%),linear-gradient(to_bottom_right,_#fff7ed,_#fdf2f8_48%,_#eff6ff)]"
        : "bg-background"
    )}>
      <div className="fixed inset-y-0 left-0 z-40 hidden w-68 lg:block">
        <AppSidebar instituteName={instituteName} items={navigationItems} parentTheme={parentTheme} />
      </div>
      <div className="min-w-0 lg:col-start-2">
        <AppHeader instituteName={instituteName} navigationItems={navigationItems} user={user} parentTheme={parentTheme} />
        <main className="mx-auto w-full max-w-[100rem] p-4 sm:p-6 lg:p-8 xl:p-10">{children}</main>
        <footer className={cn("border-t px-4 py-4 text-center text-xs sm:px-6", parentTheme ? "border-rose-100/80 bg-white/45 text-slate-500 backdrop-blur" : "text-muted-foreground")}>
          Learning Is Fun ERP
        </footer>
      </div>
    </div>
  );
}
