import { NotificationList } from "@/features/learning-planner/components/notification-list";
import { PlannerShell } from "@/features/learning-planner/components/planner-shell";
import { listPlannerMessageOutbox,listPlannerNotifications } from "@/features/learning-planner/services/notification-service";
import { requireAuth } from "@/lib/auth/services/auth-service";
export default async function NotificationsPage(){const profile=await requireAuth();const[notifications,outbox]=await Promise.all([listPlannerNotifications(profile),listPlannerMessageOutbox(profile).catch(()=>[])]);return <PlannerShell title="Notifications" description="Schedule updates and non-blocking WhatsApp queue status."><NotificationList notifications={notifications} outbox={outbox}/></PlannerShell>}
