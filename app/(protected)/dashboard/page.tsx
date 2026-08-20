import type { Metadata } from "next";

import { DashboardOverview } from "@/components/dashboard/dashboard-overview";
import { DashboardHero } from "@/components/dashboard/dashboard-hero";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getAdministratorDashboard } from "@/features/dashboard/services/dashboard-service";
import { getCurrentPermissionCodes, requireAuth, requireRole } from "@/lib/auth/services/auth-service";
import { isStaffRole } from "@/lib/auth/roles";
import { STAFF_PERMISSION_OPTIONS } from "@/lib/auth/permissions";
import { DASHBOARD_ROLES } from "@/lib/navigation";

export const metadata: Metadata = { title: "Dashboard" };

function getGreeting(): string {
  const hour = Number(new Intl.DateTimeFormat("en-IN", { hour: "2-digit", hour12: false, timeZone: "Asia/Kolkata" }).format(new Date()));
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export default async function DashboardPage() {
  const current = await requireAuth();
  if (isStaffRole(current.role)) {
    const permissions = await getCurrentPermissionCodes();
    const labels = STAFF_PERMISSION_OPTIONS.filter((item) => permissions.includes(item.code));
    return <div className="space-y-6">
      <DashboardHero greeting={getGreeting()} userName={current.name} role={current.role ?? "Staff"} instituteName={current.instituteName ?? "Learning Is Fun"} />
      <Card><CardHeader><CardTitle>Your ERP Access</CardTitle></CardHeader><CardContent>
        {labels.length ? <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{labels.map((item) => <div key={item.code} className="rounded-2xl border p-4"><p className="font-semibold">{item.label}</p><p className="mt-1 text-sm text-muted-foreground">{item.description}</p></div>)}</div> : <p className="text-muted-foreground">No module access has been assigned yet. Please contact an Administrator.</p>}
      </CardContent></Card>
    </div>;
  }

  const profile = await requireRole(DASHBOARD_ROLES);
  const dashboard = await getAdministratorDashboard(profile);
  return <div className="space-y-6"><DashboardHero greeting={getGreeting()} userName={profile.name} role={profile.role ?? "Administrator"} instituteName={profile.instituteName ?? "Learning Is Fun"} /><DashboardOverview data={dashboard} /></div>;
}
