import type { Metadata } from "next";

import { DashboardOverview } from "@/components/dashboard/dashboard-overview";
import { DashboardHero } from "@/components/dashboard/dashboard-hero";
import { getAdministratorDashboard } from "@/features/dashboard/services/dashboard-service";
import { requireRole } from "@/lib/auth/services/auth-service";
import { DASHBOARD_ROLES } from "@/lib/navigation";

export const metadata: Metadata = { title: "Dashboard" };

function getGreeting(): string {
  const hour = Number(
    new Intl.DateTimeFormat("en-IN", {
      hour: "2-digit",
      hour12: false,
      timeZone: "Asia/Kolkata",
    }).format(new Date())
  );

  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export default async function DashboardPage() {
  const profile = await requireRole(DASHBOARD_ROLES);
  const dashboard = await getAdministratorDashboard(profile);

  return (
    <div className="space-y-6">
      <DashboardHero
        greeting={getGreeting()}
        userName={profile.name}
        role={profile.role ?? "Administrator"}
        instituteName={profile.instituteName ?? "Learning Is Fun"}
      />
      <DashboardOverview data={dashboard} />
    </div>
  );
}
