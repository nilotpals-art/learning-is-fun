import { ParentDashboard } from "@/features/parent/components/parent-portal";
import { getAttendanceSummary, getContinuationSummary, getExamResultSummaries, getFeeDueSummary, getNotificationSummary, getParentChildren, getUpcomingScheduleEvents } from "@/features/parent/services/parent-service";
import { requireRole } from "@/lib/auth/services/auth-service";

export default async function Page() {
  const profile = await requireRole(["Parent"]);
  const linkedChildren = await getParentChildren(profile);
  const [continuation, notifications] = await Promise.all([getContinuationSummary(profile), getNotificationSummary(profile)]);
  const attendanceByStudent: Record<string, Awaited<ReturnType<typeof getAttendanceSummary>>> = {};
  const resultsByStudent: Record<string, Awaited<ReturnType<typeof getExamResultSummaries>>> = {};
  const feesByStudent: Record<string, Awaited<ReturnType<typeof getFeeDueSummary>>> = {};
  const scheduleByStudent: Record<string, Awaited<ReturnType<typeof getUpcomingScheduleEvents>>> = {};
  for (const child of linkedChildren) {
    const [attendance, results, fees, schedule] = await Promise.all([
      getAttendanceSummary(profile, child.studentId), getExamResultSummaries(profile, child.studentId), getFeeDueSummary(profile, child.studentId), getUpcomingScheduleEvents(profile, child.studentId),
    ]);
    attendanceByStudent[child.studentId] = attendance; resultsByStudent[child.studentId] = results; feesByStudent[child.studentId] = fees; scheduleByStudent[child.studentId] = schedule;
  }
  return <ParentDashboard linkedChildren={linkedChildren} attendanceByStudent={attendanceByStudent} resultsByStudent={resultsByStudent} feesByStudent={feesByStudent} scheduleByStudent={scheduleByStudent} continuation={continuation} notifications={notifications} />;
}
