import { AdminPaymentsManager } from "@/features/fees/components/admin-payments-manager";
import { ReceiptDeliveryPanel } from "@/features/fees/components/receipt-delivery-panel";
import { listFeePayments } from "@/features/fees/services/fee-service";
import { requireRole } from "@/lib/auth/services/auth-service";
import { DASHBOARD_ROLES } from "@/lib/navigation";

export default async function Page() {
  const profile = await requireRole(DASHBOARD_ROLES);
  const payments = await listFeePayments(profile);
  return <div className="space-y-6"><ReceiptDeliveryPanel payments={payments} /><AdminPaymentsManager payments={payments} /></div>;
}
