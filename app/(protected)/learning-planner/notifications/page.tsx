import { NotificationList } from "@/features/learning-planner/components/notification-list";
import { PlannerShell } from "@/features/learning-planner/components/planner-shell";
import { UrgentNoticeAdmin } from "@/features/learning-planner/components/urgent-notice-admin";
import { listPlannerMessageOutbox, listPlannerNotifications } from "@/features/learning-planner/services/notification-service";
import { listAdminUrgentNotices } from "@/features/learning-planner/services/urgent-notice-service";
import { requireAuth } from "@/lib/auth/services/auth-service";

export default async function NotificationsPage() {
  const profile = await requireAuth();
  const [notifications, outbox, urgentNotices] = await Promise.all([
    listPlannerNotifications(profile),
    listPlannerMessageOutbox(profile).catch(() => []),
    listAdminUrgentNotices(profile).catch(() => []),
  ]);

  return (
    <PlannerShell title="Notifications" description="Manage planner notifications and urgent popup notices for parents and students.">
      <div className="space-y-8">
        <UrgentNoticeAdmin notices={urgentNotices} />
        <NotificationList notifications={notifications} outbox={outbox} />
      </div>
    </PlannerShell>
  );
}
