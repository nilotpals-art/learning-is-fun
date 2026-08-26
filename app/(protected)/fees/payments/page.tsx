import { AdminPaymentsManager } from "@/features/fees/components/admin-payments-manager";
import { listFeePayments } from "@/features/fees/services/fee-service";
import { requireRole } from "@/lib/auth/services/auth-service";
import { DASHBOARD_ROLES } from "@/lib/navigation";

export default async function Page() {
  const profile = await requireRole(DASHBOARD_ROLES);
  return <AdminPaymentsManager payments={await listFeePayments(profile)} />;
}
