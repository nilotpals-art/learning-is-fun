import { AnnualFeeUpdateManager } from "@/features/fees/components/annual-fee-update-manager";
import { FeeSettingsManager } from "@/features/fees/components/fee-settings-manager";
import { getFeeSettings } from "@/features/fees/services/fee-service";
import { listFeeStructures } from "@/features/fees/services/fee-structure-service";
import { requireRole } from "@/lib/auth/services/auth-service";
import { DASHBOARD_ROLES } from "@/lib/navigation";

export default async function Page() {
  const profile = await requireRole(DASHBOARD_ROLES);
  const [settings, structures] = await Promise.all([getFeeSettings(profile), listFeeStructures(profile)]);
  return <div className="space-y-6">
    <FeeSettingsManager settings={settings} />
    <AnnualFeeUpdateManager structures={structures} />
  </div>;
}
