import { NotificationList } from "@/features/learning-planner/components/notification-list";
import { PlannerShell } from "@/features/learning-planner/components/planner-shell";
import { listPlannerNotifications } from "@/features/learning-planner/services/notification-service";
import { requireAuth } from "@/lib/auth/services/auth-service";
export default async function NotificationsPage(){const profile=await requireAuth();return <PlannerShell title="Notifications" description="Schedule updates delivered to your account."><NotificationList notifications={await listPlannerNotifications(profile)}/></PlannerShell>}
