import { PageHeader } from "@/components/layout/page-header";
import { ParentAttendanceView } from "@/features/parent/components/parent-portal";
import { getAttendanceSummary, getParentChildren } from "@/features/parent/services/parent-service";
import { requireRole } from "@/lib/auth/services/auth-service";

export default async function Page() {
  const profile = await requireRole(["Parent"]);
  const linkedChildren = await getParentChildren(profile);
  const attendanceByStudent: Record<string, Awaited<ReturnType<typeof getAttendanceSummary>>> = {};
  for (const child of linkedChildren) attendanceByStudent[child.studentId] = await getAttendanceSummary(profile, child.studentId);
  return <div className="space-y-6"><PageHeader title="Attendance" description="Attendance for your linked children." /><ParentAttendanceView linkedChildren={linkedChildren} attendanceByStudent={attendanceByStudent} /></div>;
}
