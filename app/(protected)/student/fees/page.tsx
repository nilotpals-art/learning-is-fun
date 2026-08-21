import { StudentFeePortal } from "@/features/fees/components/student-fee-portal";
import { getStudentIdForProfile, listFeeDues, listFeePayments } from "@/features/fees/services/fee-service";
import { requireRole } from "@/lib/auth/services/auth-service";

function indiaMonthParts(value = new Date()): { year: number; month: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(value);
  return {
    year: Number(parts.find((part) => part.type === "year")?.value ?? 0),
    month: Number(parts.find((part) => part.type === "month")?.value ?? 0),
  };
}

function currentMonthEnd(): string {
  const { year, month } = indiaMonthParts();
  return new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10);
}

function isCurrentIndiaMonth(value: string): boolean {
  const current = indiaMonthParts();
  const payment = indiaMonthParts(new Date(value));
  return payment.year === current.year && payment.month === current.month;
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
  const currentMonthPayments = payments
    .filter((payment) => isCurrentIndiaMonth(payment.paymentDate))
    .sort((left, right) => right.paymentDate.localeCompare(left.paymentDate));

  return <StudentFeePortal dues={monthlyDues} payments={currentMonthPayments} />;
}
