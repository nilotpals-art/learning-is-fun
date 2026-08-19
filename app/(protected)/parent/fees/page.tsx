import { StudentFeePortal } from "@/features/fees/components/fees-manager";
import { getFeeSettings, getParentStudentIds, listFeeDues, listFeePayments } from "@/features/fees/services/fee-service";
import { requireRole } from "@/lib/auth/services/auth-service";

export default async function Page() {
  const profile = await requireRole(["Parent"]);
  const studentIds = await getParentStudentIds(profile);
  const settingsPromise = getFeeSettings(profile);
  const [dues, payments, settings] = studentIds.length
    ? await Promise.all([listFeeDues(profile, studentIds), listFeePayments(profile, studentIds), settingsPromise])
    : [[], [], await settingsPromise];
  return <StudentFeePortal dues={dues} payments={payments} settings={settings} isParent />;
}
