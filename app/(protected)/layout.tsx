import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { AppShell } from "@/components/layout/app-shell";
import { getHolidaySettings } from "@/features/learning-planner/services/holiday-service";
import { getPortalHolidayTheme } from "@/features/learning-planner/services/portal-holiday-theme-service";
import { getCurrentPermissionCodes, getRoleDestination, requireAuth } from "@/lib/auth/services/auth-service";
import { isStaffRole } from "@/lib/auth/roles";
import { getNavigationForRole } from "@/lib/navigation";

export default async function ProtectedLayout({ children }: { children: ReactNode }) {
  const profile = await requireAuth();
  const destination = getRoleDestination(profile.role);

  if (destination !== "/dashboard" && destination !== "/student/dashboard" && destination !== "/parent/dashboard") redirect(destination);

  const instituteName = profile.instituteShortName ?? profile.instituteName ?? "Learning Is Fun";
  const permissions = isStaffRole(profile.role) ? await getCurrentPermissionCodes() : [];
  const navigationItems = getNavigationForRole(profile.role, permissions);
  const isPortalUser = profile.role === "Student" || profile.role === "Parent";
  const holidaySettings = isPortalUser ? await getHolidaySettings(profile) : null;
  const holidayTheme = isPortalUser && holidaySettings?.portalThemeEnabled ? await getPortalHolidayTheme(profile) : null;

  return <AppShell instituteName={instituteName} navigationItems={navigationItems} holidayTheme={holidayTheme} user={{ name: profile.name, email: profile.email, role: profile.role ?? "Role unavailable" }}>
    {children}
  </AppShell>;
}
