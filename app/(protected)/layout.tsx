import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { LogoutButton } from "@/features/auth/components/logout-button";
import {
  getRoleDestination,
  requireAuth,
} from "@/lib/auth/services/auth-service";

export default async function ProtectedLayout({
  children,
}: {
  children: ReactNode;
}) {
  const profile = await requireAuth();
  const destination = getRoleDestination(profile.role);

  if (destination !== "/dashboard") {
    redirect(destination);
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="flex items-center justify-between border-b bg-white px-4 py-3 sm:px-8">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{profile.email ?? "Signed in"}</p>
          <p className="text-xs text-muted-foreground">{profile.role ?? "Role unavailable"}</p>
        </div>
        <LogoutButton />
      </header>
      {children}
    </div>
  );
}
