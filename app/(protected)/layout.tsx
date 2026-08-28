import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { AppShell } from "@/components/layout/app-shell";
import { PortalInactivityLogout } from "@/features/auth/components/portal-inactivity-logout";
import { UrgentNoticePopup } from "@/features/learning-planner/components/urgent-notice-popup";
import { getHolidaySettings } from "@/features/learning-planner/services/holiday-service";
import { getPortalHolidayTheme } from "@/features/learning-planner/services/portal-holiday-theme-service";
import { listPendingUrgentNotices } from "@/features/learning-planner/services/urgent-notice-service";
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
  const [holidaySettings, urgentNotices] = await Promise.all([
    isPortalUser ? getHolidaySettings(profile) : Promise.resolve(null),
    isPortalUser ? listPendingUrgentNotices(profile).catch(() => []) : Promise.resolve([]),
  ]);
  const holidayTheme = isPortalUser && holidaySettings?.portalThemeEnabled ? await getPortalHolidayTheme(profile) : null;

  return <>
    {isPortalUser ? <PortalInactivityLogout /> : null}
    {isPortalUser && urgentNotices.length > 0 ? <UrgentNoticePopup notices={urgentNotices} /> : null}
    <AppShell instituteName={instituteName} navigationItems={navigationItems} holidayTheme={holidayTheme} user={{ name: profile.name, email: profile.email, role: profile.role ?? "Role unavailable" }}>
      {children}
    </AppShell>
  </>;
}
