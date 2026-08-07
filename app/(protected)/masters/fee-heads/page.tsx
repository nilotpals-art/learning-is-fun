import { redirect } from "next/navigation";

import { FeeHeadsManager } from "@/features/fee-heads/components/fee-heads-manager";
import { FeeHeadsSetup } from "@/features/fee-heads/components/fee-heads-setup";
import {
  getFeeHeadSetupState,
  listFeeHeads,
} from "@/features/fee-heads/services/fee-head-service";
import { requireRole } from "@/lib/auth/services/auth-service";
import { DASHBOARD_ROLES } from "@/lib/navigation";

export default async function FeeHeadsPage() {
  const profile = await requireRole(DASHBOARD_ROLES);
  if (!profile.instituteId) redirect("/unauthorized");
  const feeHeads = await listFeeHeads(profile.instituteId);
  const setupState = getFeeHeadSetupState(feeHeads);
  return (
    <div className="space-y-6">
      {!setupState.complete ? <FeeHeadsSetup state={setupState} /> : null}
      <FeeHeadsManager feeHeads={feeHeads} />
    </div>
  );
}
