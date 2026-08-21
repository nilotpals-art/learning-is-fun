import { StudentFeePortal } from "@/features/fees/components/fees-manager";
import { getStudentIdForProfile, listFeeDues, listFeePayments } from "@/features/fees/services/fee-service";
import { requireRole } from "@/lib/auth/services/auth-service";

function currentMonthEnd(): string {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0)).toISOString().slice(0, 10);
}

export default async function Page() {
  const profile = await requireRole(["Student"]);
  const studentId = await getStudentIdForProfile(profile);
  const [dues, payments] = await Promise.all([
    listFeeDues(profile, studentId),
    listFeePayments(profile, studentId),
  ]);

  const monthEnd = currentMonthEnd();
  const monthlyDues = dues
    .filter((due) => due.scheduleType === "monthly" && due.dueDate <= monthEnd)
    .sort((left, right) => left.dueDate.localeCompare(right.dueDate));

  return <StudentFeePortal dues={monthlyDues} payments={payments} />;
}
