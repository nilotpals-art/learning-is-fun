import { ParentDashboard } from "@/features/rollover/components/parent-dashboard";
import { listParentRolloverRequests } from "@/features/rollover/services/rollover-service";
import { requireRole } from "@/lib/auth/services/auth-service";

export default async function ParentDashboardPage() {
  const profile = await requireRole(["Parent"]);
  const requests = await listParentRolloverRequests(profile);
  return <ParentDashboard requests={requests} />;
}