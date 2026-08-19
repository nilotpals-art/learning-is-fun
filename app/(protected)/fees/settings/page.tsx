import { FeeSettingsManager } from "@/features/fees/components/fee-settings-manager";
import { getFeeSettings } from "@/features/fees/services/fee-service";
import { requireRole } from "@/lib/auth/services/auth-service";
import { DASHBOARD_ROLES } from "@/lib/navigation";

export default async function Page() {
  const profile = await requireRole(DASHBOARD_ROLES);
  return <FeeSettingsManager settings={await getFeeSettings(profile)} />;
}
