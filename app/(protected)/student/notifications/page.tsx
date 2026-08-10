import { NotificationList } from "@/features/learning-planner/components/notification-list";
import { listPlannerNotifications } from "@/features/learning-planner/services/notification-service";
import { StudentPageShell } from "@/features/student-dashboard/components/student-page-shell";
import { requireRole } from "@/lib/auth/services/auth-service";

export default async function StudentNotificationsPage() {
  const profile = await requireRole(["Student"]);
  return <StudentPageShell title="Notifications" description="Learning Planner updates delivered to your account."><NotificationList notifications={await listPlannerNotifications(profile)} /></StudentPageShell>;
}
