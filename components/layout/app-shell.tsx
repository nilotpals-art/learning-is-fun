import type { ReactNode } from "react";

import { AppHeader } from "@/components/layout/app-header";
import { AppSidebar } from "@/components/layout/app-sidebar";
import type { NavigationItem } from "@/lib/navigation";

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

export function AppShell({
  children,
  instituteName,
  navigationItems,
  user,
}: AppShellProps) {
  return (
    <div className="min-h-screen bg-muted/30 lg:grid lg:grid-cols-[17rem_minmax(0,1fr)]">
      <div className="fixed inset-y-0 left-0 z-40 hidden w-68 border-r border-sidebar-border lg:block">
        <AppSidebar instituteName={instituteName} items={navigationItems} />
      </div>
      <div className="min-w-0 lg:col-start-2">
        <AppHeader
          instituteName={instituteName}
          navigationItems={navigationItems}
          user={user}
        />
        <main className="mx-auto w-full max-w-[100rem] p-4 sm:p-6 lg:p-8">
          {children}
        </main>
        <footer className="border-t px-4 py-4 text-center text-xs text-muted-foreground sm:px-6">
          Learning Is Fun ERP
        </footer>
      </div>
    </div>
  );
}
