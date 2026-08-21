import { ParentDashboard } from "@/features/parent/components/parent-portal";
import { getAttendanceSummary, getContinuationSummary, getExamResultSummaries, getFeeDueSummary, getNotificationSummary, getParentChildren, getUpcomingScheduleEvents } from "@/features/parent/services/parent-service";
import { requireRole } from "@/lib/auth/services/auth-service";

export default async function Page() {
  const profile = await requireRole(["Parent"]);

  let linkedChildren: Awaited<ReturnType<typeof getParentChildren>> = [];
  try { linkedChildren = await getParentChildren(profile); } catch (error) { console.error("Parent dashboard children failed", error); }

  let continuation: Awaited<ReturnType<typeof getContinuationSummary>> = { pendingCount: 0, continuingCount: 0, notContinuingCount: 0 };
  let notifications: Awaited<ReturnType<typeof getNotificationSummary>> = { totalCount: 0, unreadCount: 0, recent: [] };
  const [continuationResult, notificationResult] = await Promise.allSettled([getContinuationSummary(profile), getNotificationSummary(profile)]);
  if (continuationResult.status === "fulfilled") continuation = continuationResult.value;
  else console.error("Parent dashboard continuation failed", continuationResult.reason);
  if (notificationResult.status === "fulfilled") notifications = notificationResult.value;
  else console.error("Parent dashboard notifications failed", notificationResult.reason);

  const attendanceByStudent: Record<string, Awaited<ReturnType<typeof getAttendanceSummary>>> = {};
  const resultsByStudent: Record<string, Awaited<ReturnType<typeof getExamResultSummaries>>> = {};
  const feesByStudent: Record<string, Awaited<ReturnType<typeof getFeeDueSummary>>> = {};
  const scheduleByStudent: Record<string, Awaited<ReturnType<typeof getUpcomingScheduleEvents>>> = {};

  for (const child of linkedChildren) {
    const [attendance, results, fees, schedule] = await Promise.allSettled([
      getAttendanceSummary(profile, child.studentId),
      getExamResultSummaries(profile, child.studentId),
      getFeeDueSummary(profile, child.studentId),
      getUpcomingScheduleEvents(profile, child.studentId),
    ]);
    if (attendance.status === "fulfilled") attendanceByStudent[child.studentId] = attendance.value;
    else console.error("Parent attendance summary failed", child.studentId, attendance.reason);
    if (results.status === "fulfilled") resultsByStudent[child.studentId] = results.value;
    else console.error("Parent results summary failed", child.studentId, results.reason);
    if (fees.status === "fulfilled") feesByStudent[child.studentId] = fees.value;
    else console.error("Parent fee summary failed", child.studentId, fees.reason);
    if (schedule.status === "fulfilled") scheduleByStudent[child.studentId] = schedule.value;
    else console.error("Parent schedule summary failed", child.studentId, schedule.reason);
  }

  return <ParentDashboard linkedChildren={linkedChildren} attendanceByStudent={attendanceByStudent} resultsByStudent={resultsByStudent} feesByStudent={feesByStudent} scheduleByStudent={scheduleByStudent} continuation={continuation} notifications={notifications} />;
}
