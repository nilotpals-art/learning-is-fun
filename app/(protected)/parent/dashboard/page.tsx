import { ParentDashboardLite } from "@/features/parent/components/parent-dashboard-lite";
import { listFeeDues } from "@/features/fees/services/fee-service";
import { getAttendanceSummary, getExamResultSummaries, getNotificationSummary, getParentChildren, getUpcomingScheduleEvents } from "@/features/parent/services/parent-service";
import { requireRole } from "@/lib/auth/services/auth-service";

export default async function Page() {
  const profile = await requireRole(["Parent"]);

  let linkedChildren: Awaited<ReturnType<typeof getParentChildren>> = [];
  try { linkedChildren = await getParentChildren(profile); } catch (error) { console.error("Parent dashboard children failed", error); }

  let notifications: Awaited<ReturnType<typeof getNotificationSummary>> = { totalCount: 0, unreadCount: 0, recent: [] };
  try { notifications = await getNotificationSummary(profile); } catch (error) { console.error("Parent dashboard notifications failed", error); }

  const attendanceByStudent: Record<string, Awaited<ReturnType<typeof getAttendanceSummary>>> = {};
  const resultsByStudent: Record<string, Awaited<ReturnType<typeof getExamResultSummaries>>> = {};
  const scheduleByStudent: Record<string, Awaited<ReturnType<typeof getUpcomingScheduleEvents>>> = {};

  for (const child of linkedChildren) {
    const [attendance, results, schedule] = await Promise.allSettled([
      getAttendanceSummary(profile, child.studentId),
      getExamResultSummaries(profile, child.studentId),
      getUpcomingScheduleEvents(profile, child.studentId),
    ]);
    if (attendance.status === "fulfilled") attendanceByStudent[child.studentId] = attendance.value;
    else console.error("Parent attendance summary failed", child.studentId, attendance.reason);
    if (results.status === "fulfilled") resultsByStudent[child.studentId] = results.value;
    else console.error("Parent results summary failed", child.studentId, results.reason);
    if (schedule.status === "fulfilled") scheduleByStudent[child.studentId] = schedule.value;
    else console.error("Parent schedule summary failed", child.studentId, schedule.reason);
  }

  const now = new Date();
  if (now.getDate() > 15 && linkedChildren.length) {
    try {
      const dues = await listFeeDues(profile, linkedChildren.map((child) => child.studentId));
      const today = now.toISOString().slice(0, 10);
      const pending = dues.filter((due) => due.outstanding > 0 && due.dueDate <= today);
      if (pending.length) {
        const childNames = [...new Set(pending.map((due) => due.studentName))].join(", ");
        notifications = {
          ...notifications,
          totalCount: notifications.totalCount + 1,
          unreadCount: notifications.unreadCount + 1,
          recent: [{
            recipientId: "fee-pending-after-15th",
            title: "Fee payment pending",
            message: `A fee payment is pending for ${childNames}. Please check Fees for the due item details.`,
            priority: "normal",
            createdAt: now.toISOString(),
            readAt: null,
          }, ...notifications.recent].slice(0, 5),
        };
      }
    } catch (error) {
      console.error("Parent fee notification check failed", error);
    }
  }

  return <ParentDashboardLite linkedChildren={linkedChildren} attendanceByStudent={attendanceByStudent} resultsByStudent={resultsByStudent} scheduleByStudent={scheduleByStudent} notifications={notifications} />;
}
