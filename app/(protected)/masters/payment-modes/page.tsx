import { redirect } from "next/navigation";

import { PaymentModesManager } from "@/features/payment-modes/components/payment-modes-manager";
import { PaymentModesSetup } from "@/features/payment-modes/components/payment-modes-setup";
import { getPaymentModeSetupState, listPaymentModes } from "@/features/payment-modes/services/payment-mode-service";
import { requireRole } from "@/lib/auth/services/auth-service";
import { DASHBOARD_ROLES } from "@/lib/navigation";

export default async function PaymentModesPage() {
  const profile = await requireRole(DASHBOARD_ROLES);
  if (!profile.instituteId) redirect("/unauthorized");
  const paymentModes = await listPaymentModes(profile.instituteId);
  const setupState = getPaymentModeSetupState(paymentModes);
  return <div className="space-y-6">{!setupState.complete ? <PaymentModesSetup state={setupState} /> : null}<PaymentModesManager paymentModes={paymentModes} /></div>;
}
