import { StudentFeePortal } from "@/features/fees/components/fees-manager";
import { getStudentIdForProfile, listFeeDues, listFeePayments, listSecurityDeposits } from "@/features/fees/services/fee-service";
import { requireRole } from "@/lib/auth/services/auth-service";

export default async function Page() {
  const profile = await requireRole(["Student"]);
  const studentId = await getStudentIdForProfile(profile);
  const [dues, payments, deposits] = await Promise.all([
    listFeeDues(profile, studentId),
    listFeePayments(profile, studentId),
    listSecurityDeposits(profile),
  ]);

  let securityDepositBalance = Math.max(
    deposits.balances.find((entry) => entry.studentId === studentId)?.balance ?? 0,
    0,
  );

  const monthlyDues = dues
    .filter((due) => due.scheduleType === "monthly")
    .sort((left, right) => left.dueDate.localeCompare(right.dueDate))
    .map((due) => {
      const depositApplied = Math.min(due.outstanding, securityDepositBalance);
      securityDepositBalance -= depositApplied;
      return { ...due, outstanding: Math.max(due.outstanding - depositApplied, 0) };
    });

  return <StudentFeePortal dues={monthlyDues} payments={payments} />;
}
