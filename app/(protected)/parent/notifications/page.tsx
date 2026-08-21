import { PageHeader } from "@/components/layout/page-header";
import { NotificationList } from "@/features/learning-planner/components/notification-list";
import { listPlannerNotifications } from "@/features/learning-planner/services/notification-service";
import { requireRole } from "@/lib/auth/services/auth-service";

export default async function ParentNotificationsPage(){
 const profile=await requireRole(["Parent"]);
 return <div className="space-y-6"><PageHeader title="Notifications" description="Messages and updates from Learning Is Fun."/><NotificationList notifications={await listPlannerNotifications(profile)}/></div>;
}
