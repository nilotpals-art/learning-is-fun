import { FeeReports } from "@/features/fees/components/fees-manager";
import { getFeeReferenceData, listFeeDues, listFeePayments } from "@/features/fees/services/fee-service";
import { requireRole } from "@/lib/auth/services/auth-service";
import { DASHBOARD_ROLES } from "@/lib/navigation";

export default async function Page() {
  const profile = await requireRole(DASHBOARD_ROLES);
  const [references, dues, payments] = await Promise.all([
    getFeeReferenceData(profile),
    listFeeDues(profile),
    listFeePayments(profile),
  ]);
  return <FeeReports students={references.students} years={references.academicYears} dues={dues} payments={payments} />;
}
