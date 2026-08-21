import { redirect } from "next/navigation";

import { AdminCollectPayment } from "@/features/fees/components/admin-collect-payment";
import { getFeeReferenceData, getFeeSettings, listFeeDues } from "@/features/fees/services/fee-service";
import { requireRole } from "@/lib/auth/services/auth-service";
import { DASHBOARD_ROLES } from "@/lib/navigation";

export default async function Page() {
  const profile = await requireRole(DASHBOARD_ROLES);
  if (!profile.instituteId) redirect("/unauthorized");
  const [references, dues, settings] = await Promise.all([
    getFeeReferenceData(profile),
    listFeeDues(profile),
    getFeeSettings(profile),
  ]);
  return <AdminCollectPayment students={references.students} years={references.academicYears} modes={references.paymentModes} dues={dues} settings={settings} />;
}
